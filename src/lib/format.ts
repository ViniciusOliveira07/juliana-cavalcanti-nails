import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const fmtDate = (d: Date | string, p = "EEEE, d 'de' MMMM") =>
  format(typeof d === "string" ? new Date(d) : d, p, { locale: ptBR });

export const fmtTime = (d: Date | string) =>
  format(typeof d === "string" ? new Date(d) : d, "HH:mm");

export const fmtMoney = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export const fmtDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtPhone = (phone: string) => {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 13 && d.startsWith("55")) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 10) return `+55 (${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
};
