import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime, fmtMoney, fmtDuration, initials, capitalize } from "@/lib/format";
import { toast } from "sonner";
import type { Appt } from "@/lib/queries";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendado", cls: "bg-brand-coral text-brand-cream" },
  completed: { label: "Concluído", cls: "bg-emerald-500 text-white" },
  cancelled: { label: "Cancelado", cls: "bg-brand-gray text-brand-cream" },
  no_show: { label: "Faltou", cls: "bg-red-500 text-white" },
};

export function ApptDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery({
    queryKey: ["appt", id],
    queryFn: async (): Promise<Appt | null> => {
      const { data } = await supabase
        .from("appointments")
        .select("id,start_at,end_at,status,client_notes,access_token,created_by, client:clients(id,name,phone), service:services(id,name,duration_minutes,price)")
        .eq("id", id).maybeSingle();
      return (data as any) ?? null;
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
              <p className="text-xs text-brand-gray mt-1">{a.service.name} · {fmtDuration(a.service.duration_minutes)} · {fmtMoney(a.service.price)}</p>
            </div>
            {a.client_notes && (
              <div>
                <p className="text-xs text-brand-gray mb-1">Observações</p>
                <p className="text-sm text-brand-wine">{a.client_notes}</p>
              </div>
            )}
            <span className={`inline-block px-3 py-1 rounded-full text-xs ${STATUS_LABEL[a.status]?.cls}`}>{STATUS_LABEL[a.status]?.label}</span>

            {a.status === "scheduled" && (
              <div className="space-y-2 pt-2">
                {new Date(a.start_at) <= new Date() && (
                  <>
                    <Button onClick={() => update.mutate({ status: "completed" })} className="w-full bg-brand-wine hover:bg-brand-wine/90 text-brand-cream">Marcar como concluído</Button>
                    <Button onClick={() => update.mutate({ status: "no_show" })} variant="outline" className="w-full">Marcar como faltou</Button>
                  </>
                )}
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
