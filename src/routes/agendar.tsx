import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Clock, ChevronLeft, ChevronRight, Calendar, Sparkles } from "lucide-react";
import { addDays, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isBefore, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useServices, useWorkingHours, useAvailableSlots, usePublicProfile } from "@/lib/queries";
import { fmtMoney, fmtDuration, fmtTime, fmtDate, capitalize } from "@/lib/format";
import { toast } from "sonner";
import { IMaskInput } from "react-imask";

export const Route = createFileRoute("/agendar")({ component: Agendar });

const DAY_NAMES = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function Agendar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = usePublicProfile();
  const { data: services = [] } = useServices(profile?.id, true);
  const { data: hours = [] } = useWorkingHours(profile?.id);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());
  const [step2, setStep2] = useState<"booking" | "form">("booking");
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [showErrors, setShowErrors] = useState(false);

  const selectedService = services.find(s => s.id === serviceId);
  const { data: slots = [], isPlaceholderData: slotsLoading } = useAvailableSlots(profile, selectedService, date ?? undefined, hours);

  const calendarDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  }), [month]);

  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = addDays(today, 60);

  const inactiveDays = new Set(hours.filter(h => !h.active).map(h => h.weekday));

  // Format hours summary
  const hoursLines = useMemo(() => {
    const sorted = [...hours].sort((a,b) => a.weekday - b.weekday);
    return sorted.map(h => {
      const day = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][h.weekday];
      return h.active
        ? `${day}: ${h.start_time.slice(0,5)} às ${h.end_time.slice(0,5)}`
        : `${day}: fechado`;
    });
  }, [hours]);

  const todayHoursStr = useMemo(() => {
    const todayDayOfWeek = new Date().getDay();
    const todayH = hours.find(h => h.weekday === todayDayOfWeek);
    if (todayH?.active) {
      return `Hoje: ${todayH.start_time.slice(0,5)} às ${todayH.end_time.slice(0,5)}`;
    }
    return "Hoje: Fechado";
  }, [hours]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!profile || !serviceId || !slotIso) throw new Error("Dados incompletos para o agendamento");
      const svc = services.find(s => s.id === serviceId)!;
      
      // 1. Verificar se o cliente já existe pelo telefone e perfil
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("phone", form.phone)
        .maybeSingle();

      let clientId: string;

      if (existingClient) {
        clientId = existingClient.id;
        // Removido o update do nome para evitar erro de RLS (permissão) em clientes já existentes
      } else {
        // 2. Se não existir, registrar novo cliente
        const { data: newClient, error: ce } = await supabase.from("clients").insert({
          profile_id: profile.id,
          name: form.name,
          phone: form.phone
        }).select("id").single();
        
        if (ce) {
          console.error("Erro ao criar cliente:", ce);
          throw new Error(`Erro ao salvar seus dados: ${ce.message}`);
        }
        clientId = newClient.id;
      }

      const start = new Date(slotIso);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      
      const { data: appt, error: ae } = await supabase.from("appointments").insert({
        profile_id: profile.id, 
        client_id: clientId, 
        service_id: serviceId,
        start_at: start.toISOString(), 
        end_at: end.toISOString(),
        client_notes: form.notes || null, 
        created_by: "client",
      }).select("access_token").single();
      
      if (ae) {
        console.error("Erro no agendamento:", ae);
        
        // Se o erro for de conflito, pode ser que o agendamento já tenha sido criado (ex: duplo clique ou erro de rede anterior)
        // Vamos tentar recuperar o token do agendamento que já existe para o usuário não ver erro
        const { data: existingAppt } = await supabase
          .from("appointments")
          .select("access_token")
          .eq("profile_id", profile.id)
          .eq("client_id", clientId)
          .eq("start_at", start.toISOString())
          .maybeSingle();

        if (existingAppt) {
          return existingAppt.access_token;
        }

        throw new Error(`Não foi possível confirmar: ${ae.message}`);
      }
      
      return appt.access_token;
    },
    onSuccess: (token) => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      navigate({ to: "/agendar/sucesso/$token", params: { token } });
    },
    onError: (e: any) => {
      const msg = e.message || "Ocorreu um erro inesperado.";
      toast.error(msg);
    },
  });

  const canContinue = serviceId && date && slotIso;
  const phoneOk = /^\+55 \(\d{2}\) \d{5}-\d{4}$/.test(form.phone);

  if (step2 === "form") {
    const svc = services.find(s => s.id === serviceId);
    
    const handleConfirm = () => {
      setShowErrors(true);
      if (!form.name) {
        toast.error("Por favor, digite seu nome");
        return;
      }
      if (!phoneOk) {
        toast.error("Por favor, digite um WhatsApp válido");
        return;
      }
      submit.mutate();
    };

    return (
      <PageWrap>
        <BrandHeader />
        
        <button onClick={() => setStep2("booking")} className="text-sm font-medium text-brand-wine inline-flex items-center gap-1 mb-4 mt-2">
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-brand-cream rounded-2xl p-4 mb-6 border border-brand-wine/10 shadow-sm">
          <div className="mb-3 pb-3 border-b border-brand-wine/10">
            <p className="text-[11px] font-semibold text-brand-wine/60 uppercase tracking-wider mb-1">Serviço</p>
            <p className="text-base font-medium text-brand-wine">{svc?.name}</p>
            <p className="text-sm text-brand-gray mt-0.5">{fmtDuration(svc?.duration_minutes ?? 0)} · {fmtMoney(svc?.price ?? 0)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-brand-wine/60 uppercase tracking-wider mb-1">Data e Hora</p>
            <p className="text-base font-medium text-brand-wine">{capitalize(fmtDate(slotIso!))} às {fmtTime(slotIso!)}</p>
          </div>
        </div>

        <div className="space-y-4 pb-8">
          <div>
            <Label className="text-brand-wine/80 ml-1 mb-1 block">Qual o seu nome?</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} 
              className={`h-14 rounded-2xl bg-white focus:border-brand-wine focus:ring-brand-wine/20 shadow-sm text-base px-4 ${showErrors && !form.name ? "border-red-500 bg-red-50" : "border-brand-rose-bg"}`} placeholder="Ex: Maria Silva" autoFocus />
          </div>
          <div>
            <Label className="text-brand-wine/80 ml-1 mb-1 block">Seu WhatsApp</Label>
            <IMaskInput
              mask="+55 (00) 00000-0000"
              placeholder="+55 (11) 99999-9999"
              value={form.phone}
              unmask={false}
              onAccept={(value) => setForm({ ...form, phone: value as string })}
              className={`flex h-14 w-full rounded-2xl border bg-white px-4 text-base shadow-sm transition-colors placeholder:text-brand-gray/50 focus-visible:outline-none focus-visible:border-brand-wine focus-visible:ring-2 focus-visible:ring-brand-wine/20 disabled:cursor-not-allowed disabled:opacity-50 ${showErrors && !phoneOk ? "border-red-500 bg-red-50" : "border-brand-rose-bg"}`}
            />
          </div>
          <div>
            <Label className="text-brand-wine/80 ml-1 mb-1 block">Alguma observação? <span className="opacity-60 text-xs font-normal">(opcional)</span></Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              className="min-h-[100px] rounded-2xl bg-white border-brand-rose-bg focus:border-brand-wine focus:ring-brand-wine/20 shadow-sm p-4 text-base" placeholder="Ex: Preciso sair até as 15h..." />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-brand-rose-bg via-brand-rose-bg/90 to-transparent pt-12 z-10 pointer-events-none flex justify-center">
          <div className="w-full max-w-[480px] px-4 pointer-events-auto">
            <Button onClick={handleConfirm} disabled={submit.isPending}
              className="w-full bg-brand-wine text-brand-cream h-14 rounded-2xl text-base font-medium shadow-xl disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.02]">
              {submit.isPending ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
          </div>
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <BrandHeader />
      <div className="text-center mt-2 mb-6">
        <h2 className="text-lg font-medium text-brand-wine">Agende seu momento</h2>
        <p className="text-sm text-brand-gray mt-1">Selecione o serviço e horário desejado</p>
      </div>

      <details className="bg-white rounded-2xl p-4 mt-2 group border border-brand-rose-bg shadow-sm [&_summary::-webkit-details-marker]:hidden">
        <summary className="text-sm font-medium text-brand-wine flex items-center justify-between cursor-pointer list-none focus:outline-none">
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-wine/70" /> <span className="truncate">{todayHoursStr}</span></div>
          <div className="flex items-center gap-1 text-[11px] text-brand-wine/60 font-normal ml-2">
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
          </div>
        </summary>
        <ul className="text-sm text-brand-wine/70 mt-3 space-y-1.5 pt-3 border-t border-brand-rose-bg">
          {hoursLines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </details>

      <Section n={1} label="Escolha o serviço">
        <div className="space-y-2">
          {services.map(s => {
            const sel = serviceId === s.id;
            return (
              <button key={s.id} onClick={() => setServiceId(s.id)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-300 ${
                  sel 
                  ? "bg-brand-rose-bg border-brand-wine shadow-md ring-1 ring-brand-wine/10 scale-[1.02]" 
                  : "bg-white border-brand-rose-bg hover:border-brand-wine/30 hover:shadow-sm"
                }`}>
                <div className="flex-1">
                  <p className={`text-base font-medium ${sel ? "text-brand-wine" : "text-brand-wine/90"}`}>{s.name}</p>
                  <p className="text-sm text-brand-gray mt-0.5">{fmtDuration(s.duration_minutes)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-base font-medium ${sel ? "text-brand-wine" : "text-brand-wine/80"}`}>{fmtMoney(s.price)}</p>
                  <p className={`text-[10px] uppercase tracking-wider font-semibold mt-1 transition-opacity ${sel ? "text-brand-wine opacity-100" : "text-transparent opacity-0"}`}>Selecionado</p>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={2} label="Escolha o dia">
        <div className="bg-white shadow-sm border border-brand-rose-bg rounded-3xl p-4">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setMonth(addMonths(month, -1))} className="p-1"><ChevronLeft className="w-4 h-4 text-brand-wine" /></button>
            <p className="text-sm font-medium text-brand-wine">{capitalize(format(month, "MMMM yyyy", { locale: ptBR }))}</p>
            <button onClick={() => setMonth(addMonths(month, 1))} className="p-1"><ChevronRight className="w-4 h-4 text-brand-wine" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map(d => <p key={d} className="text-center text-[10px] text-brand-gray py-1">{d}</p>)}
            {calendarDays.map(d => {
              const past = isBefore(d, today);
              const tooFar = isBefore(maxDate, d);
              const inactive = inactiveDays.has(d.getDay());
              const otherMonth = !isSameMonth(d, month);
              const disabled = past || tooFar || inactive || otherMonth;
              const sel = date && isSameDay(date, d);
              const isToday = isSameDay(d, today);
              return (
                <button key={d.toISOString()} disabled={disabled} onClick={() => { setDate(d); setSlotIso(null); }}
                  className={`aspect-square text-sm rounded-xl flex flex-col items-center justify-center transition-all
                    ${disabled ? "text-brand-gray/30" : ""}
                    ${sel ? "bg-brand-wine text-brand-cream font-medium shadow-md scale-105" : !disabled ? "bg-brand-rose-bg/50 border border-transparent text-brand-wine hover:bg-brand-rose-bg hover:border-brand-wine/20" : ""}`}>
                  {format(d, "d")}
                  {isToday && !sel && <span className="w-1 h-1 rounded-full bg-brand-coral" />}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {date && serviceId && (
        <Section n={3} label="Escolha o horário" badge={slots.length > 0 && slots.length <= 3 ? "Últimas vagas" : undefined}>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">{Array.from({length:6}).map((_,i) => <div key={i} className="h-12 bg-white/60 animate-pulse rounded-xl" />)}</div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-brand-gray shadow-sm border border-brand-rose-bg">Sem horários disponíveis neste dia. Tente outra data 💅</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s: any) => {
                const sel = s.slot_start === slotIso;
                return (
                  <button key={s.slot_start} onClick={() => setSlotIso(s.slot_start)}
                    className={`py-3 rounded-xl text-sm transition-all ${sel ? "bg-brand-wine text-brand-cream font-medium shadow-md scale-105" : "bg-white border border-brand-rose-bg text-brand-wine hover:border-brand-wine/30"}`}>
                    {fmtTime(s.slot_start)}
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-brand-rose-bg via-brand-rose-bg/90 to-transparent pt-12 z-10 pointer-events-none flex justify-center">
        <div className="w-full max-w-[480px] px-4 pointer-events-auto">
          <Button onClick={() => {
            setShowErrors(true);
            if (!serviceId) {
              toast.error("Selecione um serviço primeiro");
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }
            if (!date) {
              toast.error("Escolha o dia no calendário");
              return;
            }
            if (!slotIso) {
              toast.error("Selecione um horário disponível");
              return;
            }
            setStep2("form");
            setShowErrors(false);
          }}
            className="w-full bg-brand-wine text-brand-cream h-14 rounded-2xl text-base font-medium shadow-xl transition-all hover:scale-[1.02]">
            Continuar
          </Button>
        </div>
      </div>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-rose-bg pb-32">
      <div className="mx-auto max-w-[480px] p-4">
        {children}
      </div>
    </div>
  );
}

function Section({ n, label, badge, children }: { n: number; label: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-brand-gray">{n}. {label}</p>
        {badge && <span className="text-xs text-brand-coral">{badge}</span>}
      </div>
      {children}
    </section>
  );
}
