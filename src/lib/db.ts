import { supabase } from "@/integrations/supabase/client";

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return data;
}

export async function getPublicProfile() {
  // Single-tenant: pega o primeiro perfil
  const { data } = await supabase.from("profiles").select("id, name, brand_name, buffer_minutes").limit(1).maybeSingle();
  return data;
}
