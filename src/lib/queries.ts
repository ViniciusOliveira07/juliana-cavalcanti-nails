import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, addDays, differenceInMinutes } from "date-fns";
import { getMyProfile, getPublicProfile } from "@/lib/db";

export type Appt = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  client_notes: string | null;
  access_token: string;
  created_by: string;
  client: { id: string; name: string; phone: string };
  service: { id: string; name: string; duration_minutes: number; price: number };
};

export const useProfile = () =>
  useQuery({ queryKey: ["profile"], queryFn: getMyProfile });

export const usePublicProfile = () =>
  useQuery({ queryKey: ["public-profile"], queryFn: getPublicProfile });

export const useAppointmentsByDate = (date: Date) =>
  useQuery({
    queryKey: ["appointments", date.toDateString()],
    queryFn: async (): Promise<Appt[]> => {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select("id,start_at,end_at,status,client_notes,access_token,created_by, client:clients(id,name,phone), service:services(id,name,duration_minutes,price)")
        .gte("start_at", start)
        .lte("start_at", end)
        .order("start_at");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

export const useServices = (profileId?: string, onlyActive = false) =>
  useQuery({
    queryKey: ["services", profileId, onlyActive],
    queryFn: async () => {
      let q = supabase.from("services").select("*").order("created_at");
      if (profileId) q = q.eq("profile_id", profileId);
      if (onlyActive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useWorkingHours = (profileId?: string) =>
  useQuery({
    queryKey: ["working_hours", profileId],
    queryFn: async () => {
      let q = supabase.from("working_hours").select("*").order("weekday");
      if (profileId) q = q.eq("profile_id", profileId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAvailableSlots = (
  profile: any,
  service: any,
  date: Date | undefined,
  allWorkingHours: any[]
) =>
  useQuery({
    enabled: !!profile?.id && !!service?.id && !!date,
    queryKey: ["slots", profile?.id, service?.id, date?.toDateString()],
    queryFn: async () => {
      // 1. Horário de funcionamento do dia selecionado
      const whData = allWorkingHours.find(h => h.weekday === date!.getDay());
      if (!whData || !whData.active) return [];

      // 2. Agendamentos e bloqueios do dia
      const startOfDayStr = new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), 0, 0, 0).toISOString();
      const endOfDayStr = new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), 23, 59, 59).toISOString();

      const [{ data: appts }, { data: blocks }] = await Promise.all([
        supabase.from("appointments")
          .select("start_at, end_at")
          .eq("profile_id", profile.id)
          .neq("status", "cancelled")
          .gte("start_at", startOfDayStr)
          .lte("start_at", endOfDayStr),
        supabase.from("time_blocks")
          .select("start_at, end_at")
          .eq("profile_id", profile.id)
          .gte("start_at", startOfDayStr)
          .lte("start_at", endOfDayStr)
      ]);

      const bufferMs = (profile.buffer_minutes || 0) * 60000;
      
      const busy = [
        ...(appts || []).map(a => ({ 
          s: new Date(a.start_at).getTime(), 
          e: new Date(a.end_at).getTime() + bufferMs 
        })),
        ...(blocks || []).map(b => ({ 
          s: new Date(b.start_at).getTime(), 
          e: new Date(b.end_at).getTime() 
        }))
      ];

      // 3. Gerar horários a cada 30 min
      const [sh, sm] = whData.start_time.split(":").map(Number);
      const [eh, em] = whData.end_time.split(":").map(Number);
      const cursor = new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), sh, sm, 0);
      const endLimit = new Date(date!.getFullYear(), date!.getMonth(), date!.getDate(), eh, em, 0).getTime();
      const durMs = service.duration_minutes * 60000;
      const nowMs = Date.now();
      
      const slots: { slot_start: string, slot_end: string }[] = [];

      while (cursor.getTime() + durMs <= endLimit) {
        const startMs = cursor.getTime();
        const endMs = startMs + durMs;
        const totalNeededEndMs = endMs + bufferMs;

        if (startMs > nowMs) {
          const collision = busy.some(b => startMs < b.e && totalNeededEndMs > b.s);
          if (!collision) {
            slots.push({ slot_start: new Date(startMs).toISOString(), slot_end: new Date(endMs).toISOString() });
          }
        }
        cursor.setMinutes(cursor.getMinutes() + 30);
      }

      return slots;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

export const minutesUntil = (iso: string) => differenceInMinutes(new Date(iso), new Date());
export const dayBounds = (d: Date) => ({ start: startOfDay(d), end: endOfDay(d) });
export const tomorrow = () => addDays(new Date(), 1);
