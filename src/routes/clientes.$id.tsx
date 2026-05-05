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
        .select("id,start_at,status, service:services(name,price)")
        .eq("client_id", id)
        .order("start_at", { ascending: false });
      return data ?? [];
    },
  });

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

          <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium mt-6 mb-2">Histórico</h2>
          <ul className="space-y-2">
            {history.length === 0 && <li className="text-sm text-brand-gray text-center py-4">Sem agendamentos</li>}
            {history.map((a: any) => (
              <li key={a.id}>
                <button onClick={() => setSelected(a.id)} className="w-full text-left bg-brand-cream rounded-xl p-3">
                  <div className="flex justify-between">
                    <p className="text-sm text-brand-wine">{fmtDate(a.start_at, "dd/MM/yyyy 'às' HH:mm")}</p>
                    <p className="text-sm text-brand-wine">{fmtMoney(a.service.price)}</p>
                  </div>
                  <p className="text-xs text-brand-gray">{a.service.name} · {a.status}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {selected && <ApptDetailModal id={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
