import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useServices, useProfile } from "@/lib/queries";
import { fmtMoney, fmtDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos")({
  component: () => <ProtectedRoute><Servicos /></ProtectedRoute>,
});

function Servicos() {
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const save = useMutation({
    mutationFn: async (svc: any) => {
      if (!profile) return;
      if (svc.id) {
        const { error } = await supabase.from("services").update({
          name: svc.name, duration_minutes: svc.duration_minutes, price: svc.price, active: svc.active,
        }).eq("id", svc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert({ ...svc, profile_id: profile.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["services"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  });

  return (
    <AppShell>
      <header className="pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-script text-brand-wine">Serviços</h1>
        <button onClick={() => { setEditing({ name: "", duration_minutes: 60, price: 0, active: true }); setOpen(true); }}
          className="w-9 h-9 rounded-full bg-brand-wine text-brand-cream flex items-center justify-center"><Plus className="w-4 h-4" /></button>
      </header>

      <ul className="space-y-2">
        {services.map(s => (
          <li key={s.id} className="bg-brand-cream rounded-xl p-3 flex items-center gap-3">
            <button onClick={() => { setEditing(s); setOpen(true); }} className="flex-1 text-left">
              <p className="text-sm font-medium text-brand-wine">{s.name}</p>
              <p className="text-xs text-brand-gray">{fmtDuration(s.duration_minutes)} · {fmtMoney(s.price)}</p>
            </button>
            <Switch checked={s.active} onCheckedChange={(c) => toggle.mutate({ id: s.id, active: c })} />
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-brand-cream max-w-[400px]">
          <DialogHeader><DialogTitle className="text-brand-wine">{editing?.id ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Duração (minutos)</Label>
                <Input type="number" value={editing.duration_minutes} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) || 0 })} />
                <div className="flex gap-1.5 mt-1.5">
                  {[30,45,60,90,120].map(m => <button key={m} onClick={() => setEditing({ ...editing, duration_minutes: m })} className="text-xs px-2 py-1 rounded bg-brand-rose-bg text-brand-wine">{m}min</button>)}
                </div>
              </div>
              <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} /></div>
              <Button onClick={() => save.mutate(editing)} disabled={!editing.name || save.isPending} className="w-full bg-brand-wine text-brand-cream">Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
