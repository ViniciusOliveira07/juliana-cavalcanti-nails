import { Link, useLocation } from "@tanstack/react-router";
import { Calendar, CalendarDays, Users, Settings, Wallet } from "lucide-react";

const items = [
  { to: "/dashboard", icon: Calendar, label: "Hoje" },
  { to: "/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/financeiro", icon: Wallet, label: "Financeiro" },
  { to: "/configuracoes", icon: Settings, label: "Ajustes" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-brand-cream/95 backdrop-blur border-t border-brand-border z-30">
      <ul className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to}>
              <Link to={to} className="flex flex-col items-center py-2.5 gap-0.5">
                <Icon className={`w-5 h-5 ${active ? "text-brand-wine" : "text-brand-gray"}`} />
                <span className={`text-[11px] font-medium ${active ? "text-brand-wine" : "text-brand-gray"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
