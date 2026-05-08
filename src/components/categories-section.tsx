import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/lib/queries";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const ICONS = ["package","home","bolt","megaphone","school","tool","car","dots","heart","star","gift","coffee"];

function CategoryModal({ category, onClose }: { category: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "package");
  const [active, setActive] = useState(category?.active ?? true);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome obrigatório");
      if (category) {
        const { error } = await supabase.from("expense_categories")
          .update({ name: name.trim(), icon, active }).eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expense_categories").insert({
          profile_id: profile!.id, name: name.trim(), icon, active, display_order: 99,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Categoria salva");
      qc.invalidateQueries({ queryKey: ["expense_categories"] });
      qc.invalidateQueries({ queryKey: ["expense_categories_all"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] bg-brand-cream rounded-2xl">
        <DialogHeader><DialogTitle className="text-brand-wine">{category ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
          <div>
            <p className="text-xs text-brand-gray mb-2">Ícone</p>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map(i => (
                <button key={i} onClick={() => setIcon(i)}
                  className={`aspect-square rounded-lg text-xs ${icon === i ? "bg-brand-wine text-brand-cream" : "bg-white text-brand-wine"}`}>
                  {i.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-white rounded-xl p-3">
            <p className="text-sm text-brand-wine">Ativa</p>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-brand-wine text-brand-cream">Salvar</Button>
          <Button onClick={onClose} variant="ghost" className="w-full text-brand-gray">Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CategoriesSection() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["expense_categories_all", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories")
        .select("*, expenses(count)")
        .eq("profile_id", profile!.id).order("display_order");
      return data ?? [];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("expense_categories").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense_categories"] }),
  });

  return (
    <>
      <div className="flex items-center justify-between mt-6 mb-2">
        <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium">Categorias de despesa</h2>
        <button onClick={() => setCreating(true)} className="text-brand-wine"><Plus className="w-4 h-4" /></button>
      </div>
      <ul className="space-y-1.5">
        {categories.map((c: any) => (
          <li key={c.id} className="bg-brand-cream rounded-xl p-3 flex items-center gap-2">
            <button onClick={() => setEditing(c)} className="flex-1 text-left text-sm text-brand-wine">{c.name}</button>
            <Switch checked={c.active} onCheckedChange={(v) => toggleActive.mutate({ id: c.id, active: v })} />
          </li>
        ))}
      </ul>
      {creating && <CategoryModal category={null} onClose={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["expense_categories_all"] }); }} />}
      {editing && <CategoryModal category={editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["expense_categories_all"] }); }} />}
    </>
  );
}
