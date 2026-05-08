import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Download, Smartphone, Banknote, CreditCard, ArrowLeftRight } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { ExpenseModal } from "@/components/expense-modal";
import { ExportModal } from "@/components/export-modal";

export const Route = createFileRoute("/financeiro")({
  component: () => <ProtectedRoute><Financeiro /></ProtectedRoute>,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const METHOD_META: Record<string, { label: string; Icon: any }> = {
  pix: { label: "Pix", Icon: Smartphone },
  cash: { label: "Dinheiro", Icon: Banknote },
  card: { label: "Cartão", Icon: CreditCard },
  transfer: { label: "Transferência", Icon: ArrowLeftRight },
};

function useFinancial(profileId: string | undefined, year: number, month: number) {
  return useQuery({
    queryKey: ["financial", profileId, year, month],
    enabled: !!profileId,
    queryFn: async () => {
      const [summary, prev, methods, cats] = await Promise.all([
        supabase.rpc("get_financial_summary", { p_profile_id: profileId, p_year: year, p_month: month }),
        (() => {
          let py = year, pm = month - 1;
          if (pm < 1) { pm = 12; py -= 1; }
          return supabase.rpc("get_financial_summary", { p_profile_id: profileId, p_year: py, p_month: pm });
        })(),
        supabase.rpc("get_revenue_by_method", { p_profile_id: profileId, p_year: year, p_month: month }),
        supabase.rpc("get_expenses_by_category", { p_profile_id: profileId, p_year: year, p_month: month }),
      ]);
      return {
        summary: summary.data as any,
        previous: prev.data as any,
        methods: (methods.data ?? []) as any[],
        categories: (cats.data ?? []) as any[],
      };
    },
  });
}

function Financeiro() {
  const { data: profile } = useProfile();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const { data, isLoading } = useFinancial(profile?.id, year, month);

  const goPrev = () => { let m = month - 1, y = year; if (m < 1) { m = 12; y -= 1; } setMonth(m); setYear(y); };
  const goNext = () => { let m = month + 1, y = year; if (m > 12) { m = 1; y += 1; } setMonth(m); setYear(y); };

  const summary = data?.summary;
  const previous = data?.previous;
  const received = Number(summary?.revenue_received ?? 0);
  const pending = Number(summary?.revenue_pending ?? 0);
  const expenses = Number(summary?.expenses_total ?? 0);
  const expensesCount = Number(summary?.expenses_count ?? 0);
  const completed = Number(summary?.appointments_completed ?? 0);
  const profit = received - expenses;
  const prevProfit = Number(previous?.revenue_received ?? 0) - Number(previous?.expenses_total ?? 0);
  const variation = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : null;
  const avgExpense = expensesCount > 0 ? expenses / expensesCount : 0;

  return (
    <AppShell>
      <header className="pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-serif italic text-brand-wine">Financeiro</h1>
        <button onClick={() => setShowExport(true)} className="text-brand-wine flex items-center gap-1 text-sm">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </header>

      <div className="bg-brand-cream rounded-2xl p-3 flex items-center justify-between">
        <button onClick={goPrev} className="p-2 text-brand-wine"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-base font-medium text-brand-wine">{MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-brand-gray">{completed} atendimento(s) concluído(s)</p>
        </div>
        <button onClick={goNext} className="p-2 text-brand-wine"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="rounded-2xl p-5 mt-4 text-brand-cream"
        style={{ background: "linear-gradient(135deg, #E8A5AE 0%, #7B3F4A 100%)" }}>
        <p className="text-[11px] uppercase tracking-wider opacity-80">Lucro líquido</p>
        <p className="text-4xl font-medium mt-1">{fmtMoney(profit)}</p>
        {variation !== null && (
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className={`px-2 py-0.5 rounded-full ${variation >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {variation >= 0 ? "+" : ""}{variation.toFixed(0)}%
            </span>
            <span className="opacity-80">vs {MONTHS[(month - 2 + 12) % 12].toLowerCase()} ({fmtMoney(prevProfit)})</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-brand-cream rounded-2xl p-4">
          <p className="text-xs text-brand-gray">Receita</p>
          <p className="text-2xl font-medium text-brand-wine mt-1">{fmtMoney(received + pending)}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-brand-wine flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{fmtMoney(received)} recebido</p>
            {pending > 0 && (
              <p className="text-xs text-brand-wine flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>{fmtMoney(pending)} pendente</p>
            )}
          </div>
        </div>
        <div className="bg-brand-cream rounded-2xl p-4">
          <p className="text-xs text-brand-gray">Despesas</p>
          <p className="text-2xl font-medium text-brand-wine mt-1">{fmtMoney(expenses)}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-brand-gray">{expensesCount} lançamento(s)</p>
            <p className="text-xs text-brand-gray">{fmtMoney(avgExpense)} média</p>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium mb-2">Receitas por forma</h2>
        {isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-brand-cream/60 rounded-xl animate-pulse" />)}</div>
        ) : (data?.methods ?? []).length === 0 ? (
          <div className="bg-brand-cream rounded-xl p-4 text-center text-sm text-brand-gray">Sem receitas no mês</div>
        ) : (
          <ul className="space-y-1.5">
            {data!.methods.map((m: any) => {
              const meta = METHOD_META[m.method] ?? { label: m.method, Icon: Banknote };
              const Icon = meta.Icon;
              return (
                <li key={m.method} className="bg-brand-cream rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-rose-bg flex items-center justify-center"><Icon className="w-4 h-4 text-brand-wine" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-wine">{meta.label}</p>
                    <p className="text-xs text-brand-gray">{m.count} transação(ões)</p>
                  </div>
                  <p className="text-sm text-brand-wine font-medium">{fmtMoney(m.total)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] uppercase tracking-wider text-brand-gray font-medium">Despesas por categoria</h2>
          <Link to="/financeiro/despesas" className="text-xs text-brand-wine">Ver todas →</Link>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-brand-cream/60 rounded-xl animate-pulse" />)}</div>
        ) : (data?.categories ?? []).length === 0 ? (
          <div className="bg-brand-cream rounded-xl p-4 text-center text-sm text-brand-gray">Sem despesas no mês</div>
        ) : (
          <ul className="space-y-1.5">
            {data!.categories.map((c: any) => (
              <li key={c.category_id} className="bg-brand-cream rounded-xl p-3 flex items-center justify-between">
                <p className="text-sm text-brand-wine">{c.name}</p>
                <p className="text-sm text-brand-wine font-medium">{fmtMoney(c.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[448px] z-20 bg-brand-wine text-brand-cream rounded-full py-3 flex items-center justify-center gap-2 shadow-lg"
      >
        <Plus className="w-5 h-5" /> Adicionar despesa
      </button>

      {showAdd && <ExpenseModal onClose={() => setShowAdd(false)} />}
      {showExport && <ExportModal year={year} month={month} onClose={() => setShowExport(false)} />}
    </AppShell>
  );
}
