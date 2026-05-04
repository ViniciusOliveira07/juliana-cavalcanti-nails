import { useQuery } from "@tanstack/react-query";
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

export const useServices = (onlyActive = false) =>
  useQuery({
    queryKey: ["services", onlyActive],
    queryFn: async () => {
      let q = supabase.from("services").select("*").order("created_at");
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

export const useWorkingHours = () =>
  useQuery({
    queryKey: ["working_hours"],
    queryFn: async () => {
      const { data, error } = await supabase.from("working_hours").select("*").order("weekday");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAvailableSlots = (profileId: string | undefined, serviceId: string | undefined, date: Date | undefined) =>
  useQuery({
    enabled: !!profileId && !!serviceId && !!date,
    queryKey: ["slots", profileId, serviceId, date?.toDateString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_profile_id: profileId!,
        p_service_id: serviceId!,
        p_date: date!.toISOString().slice(0, 10),
      });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const minutesUntil = (iso: string) => differenceInMinutes(new Date(iso), new Date());
export const dayBounds = (d: Date) => ({ start: startOfDay(d), end: endOfDay(d) });
export const tomorrow = () => addDays(new Date(), 1);
