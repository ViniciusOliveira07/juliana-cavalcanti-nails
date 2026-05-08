import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { fmtDate, fmtMoney, initials } from "@/lib/format";
import { useState } from "react";
import { ApptDetailModal } from "@/components/appt-detail-modal";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$id")({
  component: () => <ProtectedRoute><ClientDetail /></ProtectedRoute>,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["client-history", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id,start_at,status,final_price,payment_status, service:services(name,price), payments(amount)")
        .eq("client_id", id)
        .order("start_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalSpent = (history as any[])
    .filter((a) => a.payment_status === "paid")
    .reduce((s, a) => s + Number(a.payments?.[0]?.amount ?? a.final_price ?? a.service?.price ?? 0), 0);

  return (
    <AppShell>
      <header className="pt-4 pb-3">
        <Link to="/clientes" className="inline-flex items-center text-brand-wine text-sm"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
      </header>
      {client && (
        <>
          <div className="bg-brand-cream rounded-2xl p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-rose-bg flex items-center justify-center text-brand-wine text-xl font-medium mx-auto">{initials(client.name)}</div>
            <p className="font-serif italic text-2xl text-brand-wine mt-2">{client.name}</p>
            <button className="text-xs text-brand-gray mt-1 inline-flex items-center gap-1"
              onClick={() => { navigator.clipboard.writeText(client.phone); toast.success("Telefone copiado"); }}>
              {client.phone} <Copy className="w-3 h-3" />
            </button>
            <p className="text-xs text-brand-gray mt-2">{history.length} agendamento(s)</p>
          </div>

          <div className="flex items-center justify-between mt-6 mb-2">
            <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium">Histórico</h2>
            <p className="text-xs text-brand-wine font-medium">Total: {fmtMoney(totalSpent)}</p>
          </div>
          <ul className="space-y-2">
            {history.length === 0 && <li className="text-sm text-brand-gray text-center py-4">Sem agendamentos</li>}
            {history.map((a: any) => {
              const isPaid = a.payment_status === "paid";
              const isCompleted = a.status === "completed";
              const value = a.final_price ?? a.service?.price ?? 0;
              return (
                <li key={a.id}>
                  <button onClick={() => setSelected(a.id)} className="w-full text-left bg-brand-cream rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-brand-wine">{fmtDate(a.start_at, "dd/MM/yyyy 'às' HH:mm")}</p>
                      <div className="text-right">
                        <p className="text-sm text-brand-wine">{fmtMoney(value)}</p>
                        {isCompleted && (
                          isPaid
                            ? <p className="text-[10px] text-emerald-600">● pago</p>
                            : <p className="text-[10px] text-amber-600">● pendente</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-brand-gray">{a.service?.name} · {a.status}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {selected && <ApptDetailModal id={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
