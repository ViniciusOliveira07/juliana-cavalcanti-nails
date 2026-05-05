import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtTime, fmtMoney, fmtDuration, capitalize } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/agendado/$token")({ component: Sucesso });

function Sucesso() {
  const { token } = Route.useParams();
  const link = typeof window !== "undefined" ? `${window.location.origin}/agendamento/${token}` : "";

  const { data: a } = useQuery({
    queryKey: ["appt-public", token],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("start_at, client_notes, client:clients(name), service:services(name,duration_minutes,price)")
        .eq("access_token", token).maybeSingle();
      return data as any;
    },
  });

  return (
    <div className="min-h-screen bg-brand-rose-bg pb-8">
      <div className="mx-auto max-w-[480px] px-4">
        <div className="bg-brand-cream rounded-3xl p-6 mt-4">
          <BrandHeader />
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-brand-rose-bg flex items-center justify-center"><Check className="w-10 h-10 text-brand-coral" strokeWidth={3} /></div>
            <h2 className="text-2xl font-script text-brand-wine mt-3">Agendamento confirmado!</h2>
          </div>
          {a && (
            <div className="bg-brand-rose-bg rounded-2xl p-4 mt-5">
              <p className="text-sm font-medium text-brand-wine">{a.client.name}</p>
              <p className="text-sm text-brand-wine mt-1">{a.service.name} · {fmtDuration(a.service.duration_minutes)} · {fmtMoney(a.service.price)}</p>
              <p className="text-sm text-brand-wine mt-1">{capitalize(fmtDate(a.start_at))} às {fmtTime(a.start_at)}</p>
            </div>
          )}
          <p className="text-sm text-brand-gray text-center mt-4">Em breve você receberá uma confirmação no WhatsApp 💕</p>
          <Link to="/agendamento/$token" params={{ token }}>
            <Button className="w-full mt-4 bg-brand-wine text-brand-cream h-12">Ver meu agendamento</Button>
          </Link>
          <p className="text-xs text-brand-gray text-center mt-3">Salve este link para gerenciar seu agendamento depois</p>
          <div className="flex items-center gap-2 mt-2">
            <input readOnly value={link} className="flex-1 text-xs bg-brand-rose-bg rounded-lg px-3 py-2 text-brand-wine" />
            <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }} className="p-2 bg-brand-wine text-brand-cream rounded-lg"><Copy className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
