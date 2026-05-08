import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime, fmtMoney, fmtDuration, initials, capitalize } from "@/lib/format";
import { toast } from "sonner";
import { CompleteApptModal } from "@/components/complete-appt-modal";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendado", cls: "bg-brand-coral text-brand-wine" },
  completed: { label: "Concluído", cls: "bg-emerald-500 text-white" },
  cancelled: { label: "Cancelado", cls: "bg-brand-gray text-brand-cream" },
  no_show: { label: "Faltou", cls: "bg-red-500 text-white" },
};

export function ApptDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState(false);

  const { data: a, isLoading } = useQuery({
    queryKey: ["appt", id],
    queryFn: async (): Promise<any> => {
      const { data } = await supabase
        .from("appointments")
        .select("id,start_at,end_at,status,client_notes,access_token,created_by,final_price,payment_status, client:clients(id,name,phone), service:services(id,name,duration_minutes,price), payments(amount,method,paid_at)")
        .eq("id", id).maybeSingle();
      return data ?? null;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<{ status: string; cancelled_at: string }>) => {
      const { error } = await supabase.from("appointments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appt", id] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (completing && a) {
    return <CompleteApptModal apptId={id} onClose={() => { setCompleting(false); onClose(); }} />;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[420px] bg-brand-cream rounded-2xl">
        <DialogHeader><DialogTitle className="text-brand-wine">Agendamento</DialogTitle></DialogHeader>
        {isLoading || !a ? (
          <div className="h-32 animate-pulse bg-brand-rose-bg rounded-xl" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-rose-bg flex items-center justify-center text-brand-wine font-medium">{initials(a.client.name)}</div>
              <div>
                <p className="font-medium text-brand-wine">{a.client.name}</p>
                <p className="text-xs text-brand-gray">{a.client.phone}</p>
              </div>
            </div>
            <div className="bg-brand-rose-bg rounded-xl p-4">
              <p className="text-sm text-brand-wine font-medium">{capitalize(fmtDate(a.start_at))} às {fmtTime(a.start_at)}</p>
              <p className="text-xs text-brand-gray mt-1">{a.service.name} · {fmtDuration(a.service.duration_minutes)} · {fmtMoney(a.final_price ?? a.service.price)}</p>
              {a.payment_status === "paid" && a.payments?.[0] && (
                <p className="text-xs text-emerald-700 mt-1">✓ Pago — {fmtMoney(a.payments[0].amount)} ({a.payments[0].method})</p>
              )}
            </div>
            {a.client_notes && (
              <div>
                <p className="text-xs text-brand-gray mb-1">Observações</p>
                <p className="text-sm text-brand-wine">{a.client_notes}</p>
              </div>
            )}
            <div className="flex gap-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs ${STATUS_LABEL[a.status]?.cls}`}>{STATUS_LABEL[a.status]?.label}</span>
              {a.payment_status === "paid" && <span className="inline-block px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">Pago</span>}
            </div>

            {a.status === "scheduled" && (
              <div className="space-y-2 pt-2">
                <Button onClick={() => setCompleting(true)} className="w-full bg-brand-wine hover:bg-brand-wine/90 text-brand-cream">
                  Marcar como concluído
                </Button>
                <Button onClick={() => update.mutate({ status: "no_show" })} variant="outline" className="w-full">Marcar como faltou</Button>
                <Button
                  onClick={() => { if (confirm("Cancelar este agendamento?")) update.mutate({ status: "cancelled", cancelled_at: new Date().toISOString() }); }}
                  variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                  Cancelar agendamento
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
