import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Plus, ChevronRight } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExpenseModal } from "@/components/expense-modal";

export const Route = createFileRoute("/financeiro/despesas")({
  component: () => <ProtectedRoute><Despesas /></ProtectedRoute>,
});

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function Despesas() {
  const { data: profile } = useProfile();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const goPrev = () => { let m = month - 1, y = year; if (m < 1) { m = 12; y -= 1; } setMonth(m); setYear(y); };
  const goNext = () => { let m = month + 1, y = year; if (m > 12) { m = 1; y += 1; } setMonth(m); setYear(y); };

  const { data: categories = [] } = useQuery({
    queryKey: ["expense_categories", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("expense_categories").select("*")
        .eq("profile_id", profile!.id).eq("active", true).order("display_order");
      return data ?? [];
    },
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", profile?.id, year, month, categoryFilter],
    enabled: !!profile?.id,
    queryFn: async () => {
      const start = format(new Date(year, month - 1, 1), "yyyy-MM-dd");
      const end = format(new Date(year, month, 1), "yyyy-MM-dd");
      let q = supabase.from("expenses")
        .select("*, category:expense_categories(name, icon)")
        .eq("profile_id", profile!.id)
        .gte("expense_date", start).lt("expense_date", end)
        .order("expense_date", { ascending: false });
      if (categoryFilter) q = q.eq("category_id", categoryFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const grouped: Record<string, any[]> = {};
  for (const e of expenses) {
    (grouped[e.expense_date] ??= []).push(e);
  }
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <AppShell>
      <header className="pt-4 pb-3 flex items-center justify-between">
        <Link to="/financeiro" className="inline-flex items-center text-brand-wine text-sm"><ChevronLeft className="w-4 h-4" /> Voltar</Link>
        <h1 className="text-base font-medium text-brand-wine">Despesas</h1>
        <button onClick={() => setCreating(true)} className="text-brand-wine"><Plus className="w-5 h-5" /></button>
      </header>

      <div className="bg-brand-cream rounded-2xl p-2 flex items-center justify-between">
        <button onClick={goPrev} className="p-2 text-brand-wine"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-medium text-brand-wine">{MONTHS[month - 1]} {year}</p>
        <button onClick={goNext} className="p-2 text-brand-wine"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${categoryFilter === null ? "bg-brand-wine text-brand-cream" : "bg-brand-cream text-brand-wine"}`}>
          Todas
        </button>
        {categories.map((c: any) => (
          <button key={c.id} onClick={() => setCategoryFilter(c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${categoryFilter === c.id ? "bg-brand-wine text-brand-cream" : "bg-brand-cream text-brand-wine"}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-brand-cream/60 rounded-xl animate-pulse" />)}</div>
        ) : days.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-brand-gray mb-3">Nenhuma despesa registrada neste mês</p>
            <button onClick={() => setCreating(true)} className="bg-brand-wine text-brand-cream px-4 py-2 rounded-full text-sm">Adicionar despesa</button>
          </div>
        ) : (
          days.map((d) => (
            <div key={d}>
              <p className="text-[11px] uppercase tracking-wider text-brand-gray font-medium mb-2">
                {format(new Date(d + "T00:00"), "d 'de' MMMM", { locale: ptBR })}
              </p>
              <ul className="space-y-1.5">
                {grouped[d].map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditing(e.id)} className="w-full text-left bg-brand-cream rounded-xl p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm text-brand-wine truncate">{e.description}</p>
                        <p className="text-xs text-brand-gray">{e.category?.name}</p>
                      </div>
                      <p className="text-sm text-brand-wine font-medium ml-2">{fmtMoney(e.amount)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {creating && <ExpenseModal onClose={() => setCreating(false)} />}
      {editing && <ExpenseModal expenseId={editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}
