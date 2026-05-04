
-- ============= TABLES =============

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  brand_name text,
  buffer_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, phone)
);

CREATE TABLE public.working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  active boolean NOT NULL DEFAULT true,
  UNIQUE (profile_id, weekday)
);

CREATE TABLE public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  access_token text UNIQUE NOT NULL DEFAULT '',
  client_notes text,
  created_by text NOT NULL DEFAULT 'client' CHECK (created_by IN ('client','professional')),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CHECK (end_at > start_at)
);

CREATE TABLE public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','cancelled','rescheduled','reminder_24h')),
  recipient_type text NOT NULL CHECK (recipient_type IN ('client','internal_group')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text
);

CREATE INDEX idx_appointments_profile_date_status ON public.appointments (profile_id, start_at, status);
CREATE INDEX idx_time_blocks_profile_dates ON public.time_blocks (profile_id, start_at, end_at);
CREATE INDEX idx_appointments_token ON public.appointments (access_token);

-- ============= HELPER FUNCTION =============

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============= TRIGGERS =============

-- access_token generator
CREATE OR REPLACE FUNCTION public.generate_access_token()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
BEGIN
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    FOR i IN 1..12 LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    NEW.access_token := result;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_token
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.generate_access_token();

-- updated_at on profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- conflict prevention
CREATE OR REPLACE FUNCTION public.prevent_appointment_conflicts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.profile_id = NEW.profile_id
      AND a.status = 'scheduled'
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND tstzrange(a.start_at, a.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Conflito: já existe um agendamento neste horário';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_no_conflict
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_appointment_conflicts();

-- notification events
CREATE OR REPLACE FUNCTION public.create_notification_events()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notification_events (appointment_id, event_type, recipient_type)
    VALUES (NEW.id, 'created', 'client'), (NEW.id, 'created', 'internal_group');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      INSERT INTO public.notification_events (appointment_id, event_type, recipient_type)
      VALUES (NEW.id, 'cancelled', 'client'), (NEW.id, 'cancelled', 'internal_group');
    ELSIF NEW.start_at <> OLD.start_at THEN
      INSERT INTO public.notification_events (appointment_id, event_type, recipient_type)
      VALUES (NEW.id, 'rescheduled', 'client'), (NEW.id, 'rescheduled', 'internal_group');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_notify
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.create_notification_events();

-- ============= SLOTS FUNCTION =============

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_profile_id uuid,
  p_service_id uuid,
  p_date date
)
RETURNS TABLE (slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekday int;
  v_start time;
  v_end time;
  v_active bool;
  v_duration int;
  v_buffer int;
  v_step interval;
  v_dur interval;
  v_cursor timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_slot_end timestamptz;
  v_tz text := 'America/Sao_Paulo';
BEGIN
  v_weekday := EXTRACT(DOW FROM p_date)::int;

  SELECT start_time, end_time, active INTO v_start, v_end, v_active
  FROM working_hours WHERE profile_id = p_profile_id AND weekday = v_weekday;

  IF v_start IS NULL OR NOT v_active THEN RETURN; END IF;

  SELECT duration_minutes INTO v_duration FROM services
   WHERE id = p_service_id AND profile_id = p_profile_id AND active = true;
  IF v_duration IS NULL THEN RETURN; END IF;

  SELECT buffer_minutes INTO v_buffer FROM profiles WHERE id = p_profile_id;

  v_dur  := make_interval(mins => v_duration);
  v_step := make_interval(mins => v_duration + v_buffer);

  v_day_start := (p_date::text || ' ' || v_start::text)::timestamp AT TIME ZONE v_tz;
  v_day_end   := (p_date::text || ' ' || v_end::text)::timestamp AT TIME ZONE v_tz;

  v_cursor := v_day_start;
  WHILE v_cursor + v_dur <= v_day_end LOOP
    v_slot_end := v_cursor + v_dur;

    IF (p_date <> (now() AT TIME ZONE v_tz)::date) OR v_cursor > now() THEN
      IF NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.profile_id = p_profile_id
          AND a.status = 'scheduled'
          AND tstzrange(a.start_at, a.end_at, '[)') && tstzrange(v_cursor, v_slot_end, '[)')
      ) AND NOT EXISTS (
        SELECT 1 FROM time_blocks t
        WHERE t.profile_id = p_profile_id
          AND tstzrange(t.start_at, t.end_at, '[)') && tstzrange(v_cursor, v_slot_end, '[)')
      ) THEN
        slot_start := v_cursor;
        slot_end := v_slot_end;
        RETURN NEXT;
      END IF;
    END IF;

    v_cursor := v_cursor + v_step;
  END LOOP;
END;
$$;

-- ============= RLS =============

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "owner all profiles" ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- services: owner full + public read of active
CREATE POLICY "owner all services" ON public.services
  FOR ALL USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());
CREATE POLICY "public read active services" ON public.services
  FOR SELECT USING (active = true);

-- clients: owner full + public can read/insert (for public booking)
CREATE POLICY "owner all clients" ON public.clients
  FOR ALL USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());
CREATE POLICY "public insert clients" ON public.clients
  FOR INSERT WITH CHECK (true);
CREATE POLICY "public select clients" ON public.clients
  FOR SELECT USING (true);

-- working_hours
CREATE POLICY "owner all working_hours" ON public.working_hours
  FOR ALL USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());
CREATE POLICY "public read working_hours" ON public.working_hours
  FOR SELECT USING (true);

-- time_blocks
CREATE POLICY "owner all time_blocks" ON public.time_blocks
  FOR ALL USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());
CREATE POLICY "public read time_blocks" ON public.time_blocks
  FOR SELECT USING (true);

-- appointments: owner full + public insert + public select all (token validation done in app)
CREATE POLICY "owner all appointments" ON public.appointments
  FOR ALL USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());
CREATE POLICY "public insert appointments" ON public.appointments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "public select appointments by token" ON public.appointments
  FOR SELECT USING (true);
CREATE POLICY "public cancel by token" ON public.appointments
  FOR UPDATE USING (true) WITH CHECK (true);

-- notification_events
CREATE POLICY "owner all notifications" ON public.notification_events
  FOR ALL USING (
    appointment_id IN (SELECT id FROM public.appointments WHERE profile_id = public.get_my_profile_id())
  );
