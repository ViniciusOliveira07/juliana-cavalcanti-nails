-- Libera a criação automática de notificações pelo cliente
CREATE POLICY "public insert notification_events" ON public.notification_events
  FOR INSERT WITH CHECK (true);

-- Torna a função de notificação automática (Security Definer) para evitar bloqueios de RLS
ALTER FUNCTION public.create_notification_events() SECURITY DEFINER;
