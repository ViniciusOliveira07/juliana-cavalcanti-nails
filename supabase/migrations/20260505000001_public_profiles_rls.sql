-- Permite que qualquer pessoa veja informações básicas do perfil (necessário para agendamento público)
CREATE POLICY "public read profiles" ON public.profiles
  FOR SELECT USING (true);
