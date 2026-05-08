
-- 1. appointments columns
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS final_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'none' CHECK (payment_status IN ('paid','none'));

-- 2. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method TEXT NOT NULL CHECK (method IN ('pix','cash','card','transfer')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner all payments" ON public.payments;
CREATE POLICY "owner all payments" ON public.payments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = payments.appointment_id AND a.profile_id = public.get_my_profile_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = payments.appointment_id AND a.profile_id = public.get_my_profile_id()));

-- 3. expense_categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, name)
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner all expense_categories" ON public.expense_categories;
CREATE POLICY "owner all expense_categories" ON public.expense_categories FOR ALL
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());

-- 4. expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('pix','cash','card','transfer','other')),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_profile_date ON public.expenses(profile_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner all expenses" ON public.expenses;
CREATE POLICY "owner all expenses" ON public.expenses FOR ALL
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());

DROP TRIGGER IF EXISTS expenses_touch_updated_at ON public.expenses;
CREATE TRIGGER expenses_touch_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. seed default categories per profile
INSERT INTO public.expense_categories (profile_id, name, icon, display_order)
SELECT p.id, c.name, c.icon, c.ord
FROM public.profiles p
CROSS JOIN (VALUES
  ('Materiais','package',1),
  ('Aluguel','home',2),
  ('Contas','bolt',3),
  ('Marketing','megaphone',4),
  ('Cursos','school',5),
  ('Equipamentos','tool',6),
  ('Transporte','car',7),
  ('Outros','dots',8)
) AS c(name, icon, ord)
ON CONFLICT (profile_id, name) DO NOTHING;

-- 6. seed default categories on new profile via handle_new_user replacement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile_id uuid;
  v_name text;
  d int;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (user_id, name, email, brand_name)
  VALUES (NEW.id, v_name, NEW.email, 'Juliana Cavalcanti Esmalteria')
  RETURNING id INTO v_profile_id;

  FOR d IN 0..6 LOOP
    INSERT INTO public.working_hours (profile_id, weekday, start_time, end_time, active)
    VALUES (v_profile_id, d, '09:00', '18:00', d <> 0);
  END LOOP;

  INSERT INTO public.services (profile_id, name, duration_minutes, price) VALUES
    (v_profile_id, 'Manicure simples', 45, 45.00),
    (v_profile_id, 'Pedicure', 60, 60.00),
    (v_profile_id, 'Alongamento em fibra', 120, 150.00);

  INSERT INTO public.expense_categories (profile_id, name, icon, display_order) VALUES
    (v_profile_id, 'Materiais','package',1),
    (v_profile_id, 'Aluguel','home',2),
    (v_profile_id, 'Contas','bolt',3),
    (v_profile_id, 'Marketing','megaphone',4),
    (v_profile_id, 'Cursos','school',5),
    (v_profile_id, 'Equipamentos','tool',6),
    (v_profile_id, 'Transporte','car',7),
    (v_profile_id, 'Outros','dots',8);

  RETURN NEW;
END;
$function$;

-- 7. RPC functions
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_profile_id UUID, p_month INT, p_year INT)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ := (make_date(p_year, p_month, 1)::text || ' 00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_end TIMESTAMPTZ := ((make_date(p_year, p_month, 1) + INTERVAL '1 month')::date::text || ' 00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_dstart DATE := make_date(p_year, p_month, 1);
  v_dend DATE := (v_dstart + INTERVAL '1 month')::date;
  v_result JSON;
BEGIN
  IF p_profile_id <> public.get_my_profile_id() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT json_build_object(
    'revenue_received', COALESCE((
      SELECT SUM(p.amount) FROM payments p
      JOIN appointments a ON a.id = p.appointment_id
      WHERE a.profile_id = p_profile_id
      AND p.paid_at >= v_start AND p.paid_at < v_end
    ), 0),
    'revenue_pending', COALESCE((
      SELECT SUM(COALESCE(a.final_price, s.price))
      FROM appointments a JOIN services s ON s.id = a.service_id
      WHERE a.profile_id = p_profile_id
      AND a.status = 'completed' AND a.payment_status = 'none'
      AND a.start_at >= v_start AND a.start_at < v_end
    ), 0),
    'expenses_total', COALESCE((
      SELECT SUM(amount) FROM expenses
      WHERE profile_id = p_profile_id
      AND expense_date >= v_dstart AND expense_date < v_dend
    ), 0),
    'expenses_count', (
      SELECT COUNT(*) FROM expenses
      WHERE profile_id = p_profile_id
      AND expense_date >= v_dstart AND expense_date < v_dend
    ),
    'appointments_completed', (
      SELECT COUNT(*) FROM appointments
      WHERE profile_id = p_profile_id AND status = 'completed'
      AND start_at >= v_start AND start_at < v_end
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_revenue_by_method(p_profile_id UUID, p_month INT, p_year INT)
RETURNS TABLE(method TEXT, count BIGINT, total NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start TIMESTAMPTZ := (make_date(p_year, p_month, 1)::text || ' 00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_end TIMESTAMPTZ := ((make_date(p_year, p_month, 1) + INTERVAL '1 month')::date::text || ' 00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF p_profile_id <> public.get_my_profile_id() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.method, COUNT(*)::BIGINT, COALESCE(SUM(p.amount),0)
  FROM payments p JOIN appointments a ON a.id = p.appointment_id
  WHERE a.profile_id = p_profile_id AND p.paid_at >= v_start AND p.paid_at < v_end
  GROUP BY p.method ORDER BY SUM(p.amount) DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_expenses_by_category(p_profile_id UUID, p_month INT, p_year INT)
RETURNS TABLE(category_id UUID, name TEXT, icon TEXT, count BIGINT, total NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dstart DATE := make_date(p_year, p_month, 1);
  v_dend DATE := (v_dstart + INTERVAL '1 month')::date;
BEGIN
  IF p_profile_id <> public.get_my_profile_id() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.name, c.icon, COUNT(e.*)::BIGINT, COALESCE(SUM(e.amount),0)
  FROM expense_categories c
  LEFT JOIN expenses e ON e.category_id = c.id AND e.expense_date >= v_dstart AND e.expense_date < v_dend
  WHERE c.profile_id = p_profile_id
  GROUP BY c.id, c.name, c.icon
  HAVING COALESCE(SUM(e.amount),0) > 0
  ORDER BY SUM(e.amount) DESC;
END; $$;

-- 8. backfill: completed appointments → mark as paid (no payment row insertion to avoid retroactive financial records)
UPDATE public.appointments
SET payment_status = 'paid'
WHERE status = 'completed' AND payment_status = 'none';
