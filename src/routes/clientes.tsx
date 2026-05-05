import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useClients, useProfile } from "@/lib/queries";
import { initials, fmtPhone } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IMaskInput } from "react-imask";

export const Route = createFileRoute("/clientes")({
  component: () => <ProtectedRoute><Clientes /></ProtectedRoute>,
});

function Clientes() {
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", phone: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  const save = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (form.id) {
        const { error } = await supabase.from("clients").update({ name: form.name, phone: form.phone }).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert({ name: form.name, phone: form.phone, profile_id: profile.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Cliente atualizada" : "Cliente cadastrada");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") throw new Error("Não é possível excluir uma cliente que já possui agendamentos no histórico.");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cliente excluída");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <header className="pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-serif italic text-brand-wine flex items-baseline gap-2">
          Clientes <span className="text-sm font-sans text-brand-gray">{clients.length} cadastros</span>
        </h1>
        <button onClick={() => { setForm({ id: "", name: "", phone: "" }); setOpen(true); }} className="w-9 h-9 rounded-full bg-brand-wine text-brand-cream flex items-center justify-center"><Plus className="w-4 h-4" /></button>
      </header>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
        <Input placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-brand-cream" />
      </div>

      <ul className="space-y-2 h-[calc(100vh-210px)] overflow-y-auto pb-6 pr-1 custom-scrollbar">
        {filtered.length === 0 && <li className="text-center text-sm text-brand-gray py-8">Nenhuma cliente encontrada</li>}
        {filtered.map(c => (
          <li key={c.id} className="flex items-center gap-2 bg-brand-cream rounded-xl p-3">
            <Link to="/clientes/$id" params={{ id: c.id }} className="flex-1 min-w-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-rose-bg flex shrink-0 items-center justify-center text-brand-wine text-sm font-medium">{initials(c.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-wine truncate">{c.name}</p>
                <p className="text-xs text-brand-gray">{fmtPhone(c.phone)}</p>
              </div>
            </Link>
            <button onClick={() => { setForm(c); setOpen(true); }} className="p-2 text-brand-gray hover:text-brand-wine rounded-full">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => setDeleteId(c.id)} className="p-2 text-brand-gray hover:text-red-500 rounded-full">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-brand-cream max-w-[400px]">
          <DialogHeader><DialogTitle className="text-brand-wine">{form.id ? "Editar cliente" : "Nova cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <IMaskInput
              mask="+55 (00) 00000-0000"
              placeholder="+55 (11) 99999-9999"
              value={form.phone}
              unmask={false}
              onAccept={(value) => setForm({ ...form, phone: value as string })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            />
            <Button onClick={() => save.mutate()} disabled={!form.name || !form.phone || save.isPending} className="w-full bg-brand-wine text-brand-cream">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="bg-brand-cream max-w-[400px]">
          <DialogHeader><DialogTitle className="text-brand-wine">Excluir cliente?</DialogTitle></DialogHeader>
          <p className="text-sm text-brand-gray">Esta ação não pode ser desfeita. A cliente e todos os seus dados serão removidos.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancelar</Button>
            <Button onClick={() => deleteId && remove.mutate(deleteId)} disabled={remove.isPending} className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none">Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
