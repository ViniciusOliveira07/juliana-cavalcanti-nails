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

  v_dur  := make_interval(mins => v_duration);
  v_step := make_interval(mins => 30);

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
