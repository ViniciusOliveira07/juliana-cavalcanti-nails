
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
