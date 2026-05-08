import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfile } from "@/lib/queries";
import { format } from "date-fns";
import { toast } from "sonner";

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix", cash: "Dinheiro", card: "Cartão", transfer: "Transferência", other: "Outro",
};

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = "\uFEFF" + rows.map(r => r.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ExportModal({ year, month, onClose }: { year: number; month: number; onClose: () => void }) {
  const { data: profile } = useProfile();
  const [period, setPeriod] = useState<"current" | "previous">("current");
  const [withRevenue, setWithRevenue] = useState(true);
  const [withExpenses, setWithExpenses] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!profile) return;
    if (!withRevenue && !withExpenses) { toast.error("Escolha o que exportar"); return; }

    setLoading(true);
    try {
      let y = year, m = month;
      if (period === "previous") { m -= 1; if (m < 1) { m = 12; y -= 1; } }
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");
      const monthTag = `${String(m).padStart(2, "0")}-${y}`;

      if (withRevenue) {
        const { data: pays } = await supabase
          .from("payments")
          .select("amount,method,paid_at,notes, appointment:appointments!inner(profile_id, client:clients(name), service:services(name))")
          .eq("appointment.profile_id", profile.id)
          .gte("paid_at", startISO).lt("paid_at", endISO)
          .order("paid_at");
        const rows = [["Data","Cliente","Servico","Valor","Forma_Pagamento","Observacao"]];
        for (const p of (pays ?? []) as any[]) {
          rows.push([
            format(new Date(p.paid_at), "dd/MM/yyyy"),
            p.appointment?.client?.name ?? "",
            p.appointment?.service?.name ?? "",
            Number(p.amount).toFixed(2),
            METHOD_LABEL[p.method] ?? p.method,
            p.notes ?? "",
          ]);
        }
        downloadCsv(`receitas-${monthTag}.csv`, rows);
      }

      if (withExpenses) {
        const { data: exps } = await supabase
          .from("expenses")
          .select("expense_date,description,amount,payment_method,is_recurring,notes, category:expense_categories(name)")
          .eq("profile_id", profile.id)
          .gte("expense_date", startDate).lt("expense_date", endDate)
          .order("expense_date");
        const rows = [["Data","Categoria","Descricao","Valor","Forma_Pagamento","Fixa","Observacao"]];
        for (const e of (exps ?? []) as any[]) {
          rows.push([
            format(new Date(e.expense_date + "T00:00"), "dd/MM/yyyy"),
            e.category?.name ?? "",
            e.description,
            Number(e.amount).toFixed(2),
            METHOD_LABEL[e.payment_method] ?? (e.payment_method ?? ""),
            e.is_recurring ? "Sim" : "Não",
            e.notes ?? "",
          ]);
        }
        downloadCsv(`despesas-${monthTag}.csv`, rows);
      }

      toast.success("Exportação concluída");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] bg-brand-cream rounded-2xl">
        <DialogHeader><DialogTitle className="text-brand-wine">Exportar CSV</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-brand-gray block mb-2">Período</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "current", label: "Mês atual" },
                { id: "previous", label: "Mês anterior" },
              ].map((o) => (
                <button key={o.id} onClick={() => setPeriod(o.id as any)}
                  className={`py-2 rounded-lg text-sm ${period === o.id ? "bg-brand-wine text-brand-cream" : "bg-brand-rose-bg text-brand-wine"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-brand-gray block">O que exportar</label>
            <label className="flex items-center gap-2 bg-white rounded-lg p-3">
              <Checkbox checked={withRevenue} onCheckedChange={(c) => setWithRevenue(!!c)} />
              <span className="text-sm text-brand-wine">Receitas (pagamentos)</span>
            </label>
            <label className="flex items-center gap-2 bg-white rounded-lg p-3">
              <Checkbox checked={withExpenses} onCheckedChange={(c) => setWithExpenses(!!c)} />
              <span className="text-sm text-brand-wine">Despesas</span>
            </label>
          </div>
          <Button onClick={handleExport} disabled={loading} className="w-full bg-brand-wine hover:bg-brand-wine/90 text-brand-cream">
            {loading ? "Gerando..." : "Baixar CSV"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
