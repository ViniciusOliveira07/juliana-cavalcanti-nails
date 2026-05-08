import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Copy, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useWorkingHours, useServices, useProfile } from "@/lib/queries";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDuration } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { CategoriesSection } from "@/components/categories-section";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const Route = createFileRoute("/configuracoes")({
  component: () => <ProtectedRoute><Config /></ProtectedRoute>,
});

function WorkingHourRow({ h, updateHour }: { h: any, updateHour: any }) {
  const [start, setStart] = useState(h.start_time.slice(0, 5));
  const [end, setEnd] = useState(h.end_time.slice(0, 5));

  return (
    <li className="bg-brand-cream rounded-xl p-3 flex items-center gap-2">
      <span className="text-sm text-brand-wine flex-1">{DAYS[h.weekday]}</span>
      {h.active ? (
        <>
          <Input 
            type="time" 
            value={start} 
            onChange={(e) => setStart(e.target.value)} 
            onBlur={() => updateHour.mutate({ ...h, start_time: start })}
            className="w-24 h-8 text-sm" 
          />
          <span className="text-brand-gray text-sm">–</span>
          <Input 
            type="time" 
            value={end} 
            onChange={(e) => setEnd(e.target.value)} 
            onBlur={() => updateHour.mutate({ ...h, end_time: end })}
            className="w-24 h-8 text-sm" 
          />
        </>
      ) : <span className="italic text-brand-gray text-sm">Fechado</span>}
      <Switch checked={h.active} onCheckedChange={(c) => updateHour.mutate({ ...h, active: c })} />
    </li>
  );
}


function Config() {
  const { signOut } = useAuth();
  const { data: hours = [] } = useWorkingHours();
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const updateHour = useMutation({
    mutationFn: async (h: any) => {
      const { error } = await supabase.from("working_hours").update({
        start_time: h.start_time, end_time: h.end_time, active: h.active,
      }).eq("id", h.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["working_hours"] }),
  });

  const updateBuffer = useMutation({
    mutationFn: async (mins: number) => {
      if (!profile) return;
      const { error } = await supabase.from("profiles").update({ buffer_minutes: mins }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Buffer atualizado"); qc.invalidateQueries({ queryKey: ["profile"] }); },
  });

  const publicLink = typeof window !== "undefined" ? `${window.location.origin}/agendar` : "";

  return (
    <AppShell>
      <header className="pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-serif italic text-brand-wine">Configurações</h1>
        <button onClick={() => signOut()} className="text-brand-wine"><LogOut className="w-5 h-5" /></button>
      </header>

      <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium mt-4 mb-2">Horário de expediente</h2>
      <ul className="space-y-1.5">
        {hours.map(h => (
          <WorkingHourRow key={h.id} h={h} updateHour={updateHour} />
        ))}
      </ul>

      <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium mt-6 mb-2">Serviços</h2>
      <ul className="space-y-1.5">
        {services.slice(0,3).map(s => (
          <li key={s.id} className="bg-brand-cream rounded-xl p-3 flex justify-between">
            <p className="text-sm text-brand-wine">{s.name}</p>
            <p className="text-sm text-brand-gray">{fmtDuration(s.duration_minutes)} · {fmtMoney(s.price)}</p>
          </li>
        ))}
        <li><Link to="/servicos" className="block text-center bg-brand-cream rounded-xl p-3 text-sm text-brand-wine">Ver todos →</Link></li>
      </ul>

      <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium mt-6 mb-2">Outras opções</h2>
      <div className="space-y-1.5">
        <div className="bg-brand-cream rounded-xl p-3">
          <p className="text-sm text-brand-wine mb-2">Buffer entre atendimentos</p>
          <div className="flex gap-2">
            {[0,10,15,20,30].map(m => (
              <button key={m} onClick={() => updateBuffer.mutate(m)}
                className={`flex-1 py-2 rounded-lg text-sm ${profile?.buffer_minutes === m ? "bg-brand-wine text-brand-cream" : "bg-brand-rose-bg text-brand-wine"}`}>
                {m}min
              </button>
            ))}
          </div>
        </div>
        <div className="bg-brand-cream rounded-xl p-3">
          <p className="text-sm text-brand-wine mb-2">Link público de agendamento</p>
          <div className="flex gap-2">
            <Input readOnly value={publicLink} className="flex-1 text-xs" />
            <Button onClick={() => { navigator.clipboard.writeText(publicLink); toast.success("Link copiado"); }} className="bg-brand-wine text-brand-cream"><Copy className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
