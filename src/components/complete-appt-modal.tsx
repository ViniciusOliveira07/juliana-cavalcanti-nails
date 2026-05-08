import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmtMoney, fmtTime, fmtDate, capitalize } from "@/lib/format";
import { toast } from "sonner";
import { Banknote, CreditCard, Smartphone, ArrowLeftRight } from "lucide-react";

const METHODS = [
  { id: "pix", label: "Pix", icon: Smartphone },
  { id: "cash", label: "Dinheiro", icon: Banknote },
  { id: "card", label: "Cartão", icon: CreditCard },
  { id: "transfer", label: "Transferência", icon: ArrowLeftRight },
] as const;

type Method = typeof METHODS[number]["id"];

export function CompleteApptModal({ apptId, onClose }: { apptId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: a } = useQuery({
    queryKey: ["appt-complete", apptId],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,start_at,client:clients(name), service:services(name,price)")
        .eq("id", apptId)
        .maybeSingle();
      return data as any;
    },
  });

  const [amountStr, setAmountStr] = useState("");
  const [method, setMethod] = useState<Method | null>(null);
  const [notes, setNotes] = useState("");

  // Set default amount once data loaded
  if (a && amountStr === "") setAmountStr(String(a.service.price));

  const parseAmount = (s: string) => {
    const n = Number(String(s).replace(/[^\d,.-]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const confirm = useMutation({
    mutationFn: async () => {
      const amount = parseAmount(amountStr);
      if (amount <= 0) throw new Error("Valor deve ser maior que zero");
      if (!method) throw new Error("Selecione a forma de pagamento");

      const { error: e1 } = await supabase
        .from("appointments")
        .update({ status: "completed", final_price: amount, payment_status: "paid" })
        .eq("id", apptId);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("payments").insert({
        appointment_id: apptId,
        amount,
        method,
        notes: notes || null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Atendimento concluído! 💕");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appt", apptId] });
      qc.invalidateQueries({ queryKey: ["financial"] });
      qc.invalidateQueries({ queryKey: ["client-history"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] bg-brand-cream rounded-2xl">
        <DialogHeader><DialogTitle className="text-brand-wine">Concluir atendimento</DialogTitle></DialogHeader>
        {!a ? (
          <div className="h-32 animate-pulse bg-brand-rose-bg rounded-xl" />
        ) : (
          <div className="space-y-4">
            <div className="bg-brand-rose-bg rounded-xl p-3">
              <p className="text-sm font-medium text-brand-wine">{a.client.name}</p>
              <p className="text-xs text-brand-gray mt-0.5">{a.service.name} · {capitalize(fmtDate(a.start_at, "EEE, d MMM"))} {fmtTime(a.start_at)}</p>
            </div>

            <div>
              <label className="text-xs text-brand-gray block mb-1">Valor cobrado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-wine">R$</span>
                <input
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-white border border-brand-border text-brand-wine text-lg font-medium focus:outline-none focus:ring-2 focus:ring-brand-coral"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-brand-gray block mb-2">Forma de pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition ${active ? "bg-brand-coral border-brand-coral text-brand-wine" : "bg-brand-cream border-brand-border text-brand-wine"}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs text-brand-gray block mb-1">Observação (opcional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" />
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="w-full bg-brand-wine hover:bg-brand-wine/90 text-brand-cream"
              >
                {confirm.isPending ? "Salvando..." : `Confirmar ${fmtMoney(parseAmount(amountStr))}`}
              </Button>
              <Button onClick={onClose} variant="ghost" className="w-full text-brand-gray">Cancelar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
