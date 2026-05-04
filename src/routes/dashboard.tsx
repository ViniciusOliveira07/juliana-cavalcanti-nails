import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useAppointmentsByDate, useProfile, minutesUntil } from "@/lib/queries";
import { fmtDate, fmtMoney, fmtTime, fmtDuration, capitalize } from "@/lib/format";
import { ApptDetailModal } from "@/components/appt-detail-modal";
import { useState } from "react";

export const Route = createFileRoute("/dashboard")({
  component: () => <ProtectedRoute><Dashboard /></ProtectedRoute>,
});

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: appts = [], isLoading } = useAppointmentsByDate(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const active = appts.filter((a) => a.status !== "cancelled");
  const revenue = active.reduce((s, a) => s + Number(a.service.price), 0);
  const upcoming = active.filter((a) => new Date(a.start_at) > new Date());
  const next = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <AppShell>
      <header className="flex items-start justify-between pt-6">
        <div>
          <p className="text-xs text-brand-gray">Olá, {profile?.name?.split(" ")[0] ?? "Juliana"} ✨</p>
          <p className="text-base font-medium text-brand-wine mt-0.5">{capitalize(fmtDate(new Date()))}</p>
        </div>
        <button className="p-2 rounded-full hover:bg-brand-cream"><Bell className="w-5 h-5 text-brand-wine" /></button>
      </header>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Card label="Hoje" value={String(active.length)} hint="agendamentos" />
        <Card label="Faturamento previsto" value={fmtMoney(revenue)} hint="do dia" small />
      </div>

      <Section title="Próxima cliente">
        {next ? (
          <button onClick={() => setSelected(next.id)} className="w-full text-left rounded-2xl p-5 text-brand-cream"
            style={{ background: "linear-gradient(135deg, var(--brand-coral), var(--brand-wine))" }}>
            <p className="text-xs uppercase tracking-wider opacity-80">Em {Math.max(0, minutesUntil(next.start_at))} min</p>
            <p className="text-xl font-medium mt-1">{next.client.name}</p>
            <p className="text-3xl font-script mt-1">{fmtTime(next.start_at)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Pill>{next.service.name}</Pill>
              <Pill>{fmtDuration(next.service.duration_minutes)}</Pill>
              <Pill>{fmtMoney(next.service.price)}</Pill>
            </div>
          </button>
        ) : (
          <EmptyCard>Sem próximos agendamentos hoje 💅</EmptyCard>
        )}
      </Section>

      <Section title="Próximos do dia" right={<Link to="/agenda" className="text-xs text-brand-wine">Ver agenda →</Link>}>
        {isLoading ? (
          <Skeleton />
        ) : rest.length === 0 ? (
          <EmptyCard>Nada além do próximo</EmptyCard>
        ) : (
          <ul className="space-y-2">
            {rest.map((a) => (
              <li key={a.id}>
                <button onClick={() => setSelected(a.id)} className="w-full flex items-center gap-3 bg-brand-cream rounded-xl p-3 text-left">
                  <span className="px-2.5 py-1 rounded-lg bg-brand-rose-bg text-brand-wine text-sm font-medium">{fmtTime(a.start_at)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-wine truncate">{a.client.name}</p>
                    <p className="text-xs text-brand-gray truncate">{a.service.name} · {fmtDuration(a.service.duration_minutes)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selected && <ApptDetailModal id={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}

function Card({ label, value, hint, small }: { label: string; value: string; hint: string; small?: boolean }) {
  return (
    <div className="bg-brand-cream rounded-2xl p-4">
      <p className="text-xs text-brand-gray">{label}</p>
      <p className={`${small ? "text-2xl" : "text-3xl"} font-medium text-brand-wine mt-1`}>{value}</p>
      <p className="text-xs text-brand-gray mt-0.5">{hint}</p>
    </div>
  );
}
function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs">{children}</span>;
}
function EmptyCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-cream rounded-xl p-5 text-center text-sm text-brand-gray">{children}</div>;
}
function Skeleton() {
  return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-brand-cream/60 rounded-xl animate-pulse" />)}</div>;
}
