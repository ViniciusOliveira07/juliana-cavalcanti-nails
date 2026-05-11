ALTER TABLE public.appointments ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.appointments DROP CONSTRAINT appointments_client_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;