import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
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

export const Route = createFileRoute("/agendar")({ component: Agendar });

const DAY_NAMES = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function Agendar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = usePublicProfile();
  const { data: services = [] } = useServices(true);
  const { data: hours = [] } = useWorkingHours();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [slotIso, setSlotIso] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());
  const [step2, setStep2] = useState<"booking" | "form">("booking");
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });

  const { data: slots = [], isLoading: slotsLoading } = useAvailableSlots(profile?.id, serviceId ?? undefined, date ?? undefined);

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

  const submit = useMutation({
    mutationFn: async () => {
      if (!profile || !serviceId || !slotIso) throw new Error("Dados incompletos");
      const svc = services.find(s => s.id === serviceId)!;
      // upsert client
      const { data: client, error: ce } = await supabase.from("clients").upsert(
        { profile_id: profile.id, name: form.name, phone: form.phone },
        { onConflict: "profile_id,phone" }
      ).select("id").single();
      if (ce) throw ce;
      const start = new Date(slotIso);
      const end = new Date(start.getTime() + svc.duration_minutes * 60_000);
      const { data: appt, error: ae } = await supabase.from("appointments").insert({
        profile_id: profile.id, client_id: client.id, service_id: serviceId,
        start_at: start.toISOString(), end_at: end.toISOString(),
        client_notes: form.notes || null, created_by: "client",
      }).select("access_token").single();
      if (ae) throw ae;
      return appt.access_token;
    },
    onSuccess: (token) => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      navigate({ to: "/agendar/sucesso/$token", params: { token } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canContinue = serviceId && date && slotIso;
  const phoneOk = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(form.phone.replace(/\s/g, ""));

  if (step2 === "form") {
    const svc = services.find(s => s.id === serviceId);
    return (
      <PageWrap>
        <BrandHeader />
        <button onClick={() => setStep2("booking")} className="text-sm text-brand-wine inline-flex items-center"><ChevronLeft className="w-4 h-4" /> Voltar</button>
        <div className="bg-brand-rose-bg rounded-2xl p-4 mt-3">
          <p className="text-sm font-medium text-brand-wine">{svc?.name} · {fmtDuration(svc?.duration_minutes ?? 0)} · {fmtMoney(svc?.price ?? 0)}</p>
          <p className="text-sm text-brand-wine mt-1">{capitalize(fmtDate(slotIso!))} às {fmtTime(slotIso!)}</p>
        </div>
        <div className="space-y-4 mt-4">
          <div><Label>Seu nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12" autoFocus /></div>
          <div><Label>Telefone</Label><Input value={form.phone} placeholder="(11) 99999-9999" onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-12" /></div>
          <div><Label>Alguma observação? (opcional)</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button onClick={() => submit.mutate()} disabled={!form.name || !phoneOk || submit.isPending}
            className="w-full bg-brand-wine text-brand-cream h-12 text-base">
            {submit.isPending ? "Confirmando..." : "Confirmar agendamento"}
          </Button>
        </div>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <BrandHeader />
      <div className="bg-brand-rose-bg rounded-2xl p-4 mt-2">
        <p className="text-sm font-medium text-brand-wine flex items-center gap-2"><Clock className="w-4 h-4" /> Horário de atendimento</p>
        <ul className="text-sm text-brand-wine/90 mt-2 space-y-0.5">
          {hoursLines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </div>

      <Section n={1} label="Escolha o serviço">
        <div className="space-y-2">
          {services.map(s => {
            const sel = serviceId === s.id;
            return (
              <button key={s.id} onClick={() => setServiceId(s.id)}
                className={`w-full p-4 rounded-xl border text-left flex justify-between ${sel ? "border-brand-coral border-[1.5px] bg-brand-rose-bg" : "border-brand-border bg-brand-cream"}`}>
                <div>
                  <p className="text-base font-medium text-brand-wine">{s.name}</p>
                  <p className="text-sm text-brand-gray">{fmtDuration(s.duration_minutes)}</p>
                </div>
                <p className="text-base font-medium text-brand-wine">{fmtMoney(s.price)}</p>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={2} label="Escolha o dia">
        <div className="bg-brand-cream rounded-2xl p-3">
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
                  className={`aspect-square text-sm rounded-lg flex flex-col items-center justify-center
                    ${disabled ? "text-brand-gray/40" : ""}
                    ${sel ? "bg-brand-wine text-brand-cream font-medium" : !disabled ? "bg-brand-cream border border-brand-border text-brand-wine hover:bg-brand-rose-bg" : ""}`}>
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
            <div className="grid grid-cols-3 gap-2">{Array.from({length:6}).map((_,i) => <div key={i} className="h-12 bg-brand-cream/60 animate-pulse rounded-lg" />)}</div>
          ) : slots.length === 0 ? (
            <div className="bg-brand-cream rounded-xl p-4 text-center text-sm text-brand-gray">Sem horários disponíveis neste dia. Tente outra data 💅</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s: any) => {
                const sel = s.slot_start === slotIso;
                return (
                  <button key={s.slot_start} onClick={() => setSlotIso(s.slot_start)}
                    className={`py-3 rounded-lg text-sm ${sel ? "bg-brand-wine text-brand-cream font-medium" : "bg-brand-cream border border-brand-border text-brand-wine"}`}>
                    {fmtTime(s.slot_start)}
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      )}

      <div className="sticky bottom-4 mt-6">
        <Button disabled={!canContinue} onClick={() => setStep2("form")}
          className="w-full bg-brand-wine text-brand-cream h-12 text-base disabled:opacity-50">
          Continuar
        </Button>
      </div>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-rose-bg pb-8">
      <div className="mx-auto max-w-[480px] px-4">
        <div className="bg-brand-cream rounded-3xl p-5 mt-4">
          {children}
        </div>
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
