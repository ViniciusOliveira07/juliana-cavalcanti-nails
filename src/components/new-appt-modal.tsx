import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useServices, useProfile, useAvailableSlots, useWorkingHours } from "@/lib/queries";
import { fmtMoney, fmtDuration, fmtTime, fmtPhone } from "@/lib/format";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { IMaskInput } from "react-imask";

export function NewApptModal({ initialDate, initialHour, onClose }: { initialDate: Date; initialHour?: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: services = [] } = useServices(profile?.id, true);
  const { data: clients = [] } = useClients();
  const [step, setStep] = useState(1);
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(initialDate);
  const [slotIso, setSlotIso] = useState<string | null>(null);

  const filteredClients = useMemo(() =>
    clients.filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase()) || c.phone.includes(clientQuery)),
    [clients, clientQuery]);

  const { data: hours = [] } = useWorkingHours(profile?.id);
  const selectedService = services.find(s => s.id === serviceId);
  const { data: slots = [] } = useAvailableSlots(profile, selectedService, date, hours);

  const create = useMutation({
    mutationFn: async () => {
      if (!profile || !serviceId || !slotIso) throw new Error("Dados incompletos");
      let cid = clientId;
      if (!cid) {
        if (!newClient.name || !newClient.phone) throw new Error("Preencha nome e telefone");
        const { data, error } = await supabase.from("clients").upsert(
          { profile_id: profile.id, name: newClient.name, phone: newClient.phone },
          { onConflict: "profile_id,phone" }
        ).select("id").single();
        if (error) throw error;
        cid = data.id;
      }
      const svc = services.find(s => s.id === serviceId)!;
      const start = new Date(slotIso);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      const { error } = await supabase.from("appointments").insert({
        profile_id: profile.id, client_id: cid, service_id: serviceId,
        start_at: start.toISOString(), end_at: end.toISOString(),
        created_by: "professional",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento criado!");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] bg-brand-cream rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-brand-wine">Novo agendamento — Etapa {step} de 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <Input placeholder="Buscar por nome ou telefone" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredClients.slice(0, 8).map(c => (
                <button key={c.id} onClick={() => { setClientId(c.id); setStep(2); }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-brand-rose-bg">
                  <p className="text-sm font-medium text-brand-wine">{c.name}</p>
                  <p className="text-xs text-brand-gray">{fmtPhone(c.phone)}</p>
                </button>
              ))}
            </div>
            <div className="border-t border-brand-border pt-3 space-y-2">
              <p className="text-xs text-brand-gray uppercase">Ou nova cliente</p>
              <Input placeholder="Nome" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
              <IMaskInput
                mask="+55 (00) 00000-0000"
                placeholder="+55 (11) 99999-9999"
                value={newClient.phone}
                unmask={false}
                onAccept={(value) => setNewClient({ ...newClient, phone: value as string })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
              <Button onClick={() => { setClientId(null); setStep(2); }} disabled={!newClient.name || !newClient.phone} className="w-full bg-brand-wine text-brand-cream">Continuar</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            {services.map(s => (
              <button key={s.id} onClick={() => { setServiceId(s.id); setStep(3); }}
                className={`w-full text-left p-3 rounded-xl border ${serviceId === s.id ? "border-brand-coral bg-brand-rose-bg" : "border-brand-border bg-brand-cream"}`}>
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium text-brand-wine">{s.name}</p>
                    <p className="text-xs text-brand-gray">{fmtDuration(s.duration_minutes)}</p>
                  </div>
                  <p className="text-sm font-medium text-brand-wine">{fmtMoney(s.price)}</p>
                </div>
              </button>
            ))}
            <Button variant="outline" onClick={() => setStep(1)} className="w-full">Voltar</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)).map(d => {
                const sel = format(d, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
                return (
                  <button key={d.toISOString()} onClick={() => setDate(d)}
                    className={`flex-1 py-2 rounded-lg text-xs ${sel ? "bg-brand-wine text-brand-cream" : "bg-brand-rose-bg text-brand-wine"}`}>
                    {format(d, "dd/MM")}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
              {slots.length === 0 && <p className="col-span-3 text-center text-sm text-brand-gray py-6">Sem horários disponíveis</p>}
              {slots.map((s: any) => {
                const sel = s.slot_start === slotIso;
                return (
                  <button key={s.slot_start} onClick={() => setSlotIso(s.slot_start)}
                    className={`py-2.5 rounded-lg text-sm ${sel ? "bg-brand-wine text-brand-cream font-medium" : "bg-brand-cream border border-brand-border text-brand-wine"}`}>
                    {fmtTime(s.slot_start)}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Voltar</Button>
              <Button onClick={() => create.mutate()} disabled={!slotIso || create.isPending} className="flex-1 bg-brand-wine text-brand-cream">
                {create.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
