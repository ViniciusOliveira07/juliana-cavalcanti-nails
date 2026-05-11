import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime, fmtMoney, fmtDuration, capitalize } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/agendamento/$token")({ component: Manage });

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendado", cls: "bg-brand-coral text-brand-cream" },
  completed: { label: "Concluído", cls: "bg-emerald-500 text-white" },
  cancelled: { label: "Cancelado", cls: "bg-brand-gray text-brand-cream" },
  no_show: { label: "Não compareceu", cls: "bg-red-500 text-white" },
};

function Manage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery({
    queryKey: ["appt-public", token],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,start_at,status,client_notes, client:clients(name), service:services(name,duration_minutes,price)")
        .eq("access_token", token).maybeSingle();
      return data as any;
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!a) return;
      const { error } = await supabase.from("appointments").update({
        status: "cancelled", cancelled_at: new Date().toISOString(),
      }).eq("access_token", token);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agendamento cancelado"); qc.invalidateQueries({ queryKey: ["appt-public", token] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-brand-rose-bg pb-8">
      <div className="mx-auto max-w-[480px] px-4">
        <div className="bg-brand-cream rounded-3xl p-5 mt-4">
          <BrandHeader />
          {isLoading ? (
            <div className="h-40 animate-pulse bg-brand-rose-bg rounded-xl" />
          ) : !a ? (
            <p className="text-center text-sm text-brand-gray py-8">Agendamento não encontrado</p>
          ) : (
            <>
              <div className="bg-brand-rose-bg rounded-2xl p-5">
                <span className={`inline-block px-3 py-1 rounded-full text-xs ${STATUS[a.status]?.cls}`}>{STATUS[a.status]?.label}</span>
                <p className="text-base font-medium text-brand-wine mt-3">{a.client?.name ?? "Cliente removida"}</p>
                <p className="text-sm text-brand-wine mt-1">{a.service.name} · {fmtDuration(a.service.duration_minutes)} · {fmtMoney(a.service.price)}</p>
                <p className="text-xl font-serif italic text-brand-wine mt-4">{capitalize(fmtDate(a.start_at))}</p>
                <p className="text-2xl font-serif italic text-brand-wine">às {fmtTime(a.start_at)}</p>
                {a.client_notes && <p className="text-sm text-brand-gray mt-3 italic">"{a.client_notes}"</p>}
              </div>

              {a.status === "scheduled" ? (
                <div className="space-y-2 mt-5">
                  <Button onClick={() => { if (confirm("Tem certeza que quer cancelar?")) cancel.mutate(); }}
                    variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 h-12">
                    Cancelar agendamento
                  </Button>
                </div>
              ) : (
                <div className="text-center mt-6 py-4 border-t border-brand-wine/10">
                  <p className="text-sm text-brand-gray mb-4">
                    Este agendamento foi {STATUS[a.status]?.label.toLowerCase()}.
                  </p>
                  <Link to="/agendar">
                    <Button className="w-full bg-brand-wine text-brand-cream h-12 shadow-md hover:scale-[1.02] transition-transform">
                      Agendar novo horário ✨
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
