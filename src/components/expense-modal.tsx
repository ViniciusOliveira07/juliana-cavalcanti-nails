import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/lib/queries";
import { format } from "date-fns";
import { toast } from "sonner";

const METHODS = [
  { id: "pix", label: "Pix" },
  { id: "cash", label: "Dinheiro" },
  { id: "card", label: "Cartão" },
  { id: "transfer", label: "Transferência" },
  { id: "other", label: "Outro" },
] as const;

export function ExpenseModal({ expenseId, onClose }: { expenseId?: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();

  const { data: categories = [] } = useQuery({
    queryKey: ["expense_categories", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("profile_id", profile!.id)
        .eq("active", true)
        .order("display_order");
      return data ?? [];
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["expense", expenseId],
    enabled: !!expenseId,
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*").eq("id", expenseId!).maybeSingle();
      return data;
    },
  });

  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState<string>("pix");
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (existing && !loaded) {
    setDescription(existing.description);
    setAmountStr(String(existing.amount));
    setCategoryId(existing.category_id);
    setDate(existing.expense_date);
    setMethod(existing.payment_method ?? "pix");
    setRecurring(existing.is_recurring);
    setNotes(existing.notes ?? "");
    setLoaded(true);
  }

  if (!categoryId && categories.length > 0 && !expenseId) {
    setCategoryId(categories[0].id);
  }

  const parseAmount = (s: string) => {
    const n = Number(String(s).replace(/[^\d,.-]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const save = useMutation({
    mutationFn: async () => {
      const amount = parseAmount(amountStr);
      if (!description.trim()) throw new Error("Descrição obrigatória");
      if (amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (!categoryId) throw new Error("Selecione a categoria");

      const payload = {
        profile_id: profile!.id,
        category_id: categoryId,
        description: description.trim(),
        amount,
        expense_date: date,
        payment_method: method,
        is_recurring: recurring,
        notes: notes || null,
      };

      if (expenseId) {
        const { error } = await supabase.from("expenses").update(payload).eq("id", expenseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(expenseId ? "Despesa atualizada" : "Despesa adicionada");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["financial"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa excluída");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["financial"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[440px] bg-brand-cream rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-brand-wine">{expenseId ? "Editar despesa" : "Nova despesa"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-brand-gray block mb-1">Descrição</label>
            <Input autoFocus value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Compra de esmaltes" />
          </div>
          <div>
            <label className="text-xs text-brand-gray block mb-1">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-wine">R$</span>
              <input
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2 rounded-md bg-white border border-brand-border text-brand-wine focus:outline-none focus:ring-2 focus:ring-brand-coral"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-brand-gray block mb-1">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full p-2 rounded-md bg-white border border-brand-border text-brand-wine">
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-brand-gray block mb-1">Data</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-brand-gray block mb-1">Forma</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full p-2 rounded-md bg-white border border-brand-border text-brand-wine h-10">
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between bg-brand-rose-bg/50 rounded-xl p-3">
            <div>
              <p className="text-sm text-brand-wine">Despesa fixa mensal</p>
              <p className="text-xs text-brand-gray">Apenas marcação informativa</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>
          <div>
            <label className="text-xs text-brand-gray block mb-1">Observação (opcional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
          </div>
          <div className="space-y-2 pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full bg-brand-wine hover:bg-brand-wine/90 text-brand-cream">
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full text-brand-gray">Cancelar</Button>
            {expenseId && (
              <Button
                onClick={() => { if (confirm("Excluir esta despesa?")) remove.mutate(); }}
                variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
