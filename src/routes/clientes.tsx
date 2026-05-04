import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useClients, useProfile } from "@/lib/queries";
import { initials } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  component: () => <ProtectedRoute><Clientes /></ProtectedRoute>,
});

function Clientes() {
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  const create = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await supabase.from("clients").insert({ ...form, profile_id: profile.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrada");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setAdding(false); setForm({ name: "", phone: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <header className="pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-script text-brand-wine">Clientes</h1>
        <button onClick={() => setAdding(true)} className="w-9 h-9 rounded-full bg-brand-wine text-brand-cream flex items-center justify-center"><Plus className="w-4 h-4" /></button>
      </header>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        <Input placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-brand-cream" />
      </div>

      <ul className="space-y-2">
        {filtered.length === 0 && <li className="text-center text-sm text-brand-gray py-8">Nenhuma cliente cadastrada</li>}
        {filtered.map(c => (
          <li key={c.id}>
            <Link to="/clientes/$id" params={{ id: c.id }} className="flex items-center gap-3 bg-brand-cream rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-brand-rose-bg flex items-center justify-center text-brand-wine text-sm font-medium">{initials(c.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-wine truncate">{c.name}</p>
                <p className="text-xs text-brand-gray">{c.phone}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="bg-brand-cream max-w-[400px]">
          <DialogHeader><DialogTitle className="text-brand-wine">Nova cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Button onClick={() => create.mutate()} disabled={!form.name || !form.phone || create.isPending} className="w-full bg-brand-wine text-brand-cream">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
