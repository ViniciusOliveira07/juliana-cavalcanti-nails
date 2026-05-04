import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDays, subDays } from "date-fns";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAppointmentsByDate } from "@/lib/queries";
import { fmtDate, fmtTime, fmtDuration, capitalize } from "@/lib/format";
import { ApptDetailModal } from "@/components/appt-detail-modal";
import { NewApptModal } from "@/components/new-appt-modal";

export const Route = createFileRoute("/agenda")({
  component: () => <ProtectedRoute><Agenda /></ProtectedRoute>,
});

function Agenda() {
  const [date, setDate] = useState(new Date());
  const { data: appts = [] } = useAppointmentsByDate(date);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ date: Date; hour?: number } | null>(null);

  const active = appts.filter((a) => a.status !== "cancelled");
  const hours = Array.from({ length: 10 }, (_, i) => 9 + i); // 9-18

  return (
    <AppShell>
      <header className="pt-6 pb-3">
        <h1 className="text-2xl font-script text-brand-wine">Agenda</h1>
      </header>

      <div className="flex items-center justify-between bg-brand-cream rounded-xl px-3 py-2.5">
        <button onClick={() => setDate(subDays(date, 1))} className="p-1.5"><ChevronLeft className="w-5 h-5 text-brand-wine" /></button>
        <div className="text-center">
          <p className="text-sm font-medium text-brand-wine">{capitalize(fmtDate(date))}</p>
          <p className="text-xs text-brand-gray">{active.length} agendamentos</p>
        </div>
        <button onClick={() => setDate(addDays(date, 1))} className="p-1.5"><ChevronRight className="w-5 h-5 text-brand-wine" /></button>
      </div>

      <div className="mt-4 space-y-1.5">
        {hours.map((h) => {
          const slot = active.find((a) => new Date(a.start_at).getHours() === h);
          return (
            <div key={h} className="flex gap-2 items-stretch">
              <div className="w-11 text-xs text-brand-gray pt-3">{String(h).padStart(2, "0")}:00</div>
              {slot ? (
                <button onClick={() => setSelected(slot.id)}
                  className="flex-1 text-left bg-brand-rose-bg rounded-xl pl-3 pr-3 py-2.5 border-l-[3px] border-brand-coral">
                  <p className="text-sm font-medium text-brand-wine">{slot.client.name} <span className="text-xs text-brand-gray">· {fmtTime(slot.start_at)}</span></p>
                  <p className="text-xs text-brand-gray">{slot.service.name} · {fmtDuration(slot.service.duration_minutes)}</p>
                </button>
              ) : (
                <button onClick={() => setCreating({ date, hour: h })} className="flex-1 text-left rounded-xl py-3 px-3 italic text-brand-gray/70 text-sm hover:bg-brand-cream/60">
                  Livre
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={() => setCreating({ date })}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-brand-wine text-brand-cream px-5 py-3 rounded-full shadow-lg hover:bg-brand-wine/90">
        <Plus className="w-4 h-4" /> Novo agendamento
      </button>

      {selected && <ApptDetailModal id={selected} onClose={() => setSelected(null)} />}
      {creating && <NewApptModal initialDate={creating.date} initialHour={creating.hour} onClose={() => setCreating(null)} />}
    </AppShell>
  );
}
