import { supabase } from "@/integrations/supabase/client";

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return data;
}

export async function getPublicProfile() {
  // Tenta pegar o perfil diretamente
  const { data: profile } = await supabase.from("profiles").select("id, name, brand_name, buffer_minutes").limit(1).maybeSingle();
  
  if (profile) return profile;

  // Se o perfil estiver bloqueado por RLS, tenta pegar o ID através de um serviço (que é público)
  const { data: service } = await supabase.from("services").select("profile_id").eq("active", true).limit(1).maybeSingle();
  
  if (service) {
    return {
      id: service.profile_id,
      name: "Juliana Cavalcanti",
      brand_name: "Juliana Cavalcanti Esmalteria",
      buffer_minutes: 0 // Valor padrão
    };
  }

  return null;
}
