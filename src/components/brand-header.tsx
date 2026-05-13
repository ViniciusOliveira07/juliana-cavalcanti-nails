import logo from "@/assets/logo-juliana.jpeg";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-coral/40 to-brand-gold/30 blur-md" />
        <div className="relative w-28 h-28 rounded-full overflow-hidden ring-1 ring-brand-gold/60 bg-brand-cream shadow-[0_8px_30px_-10px_rgba(123,63,74,0.35)]">
          <img src={logo} alt="Juliana Cavalcanti Esmalteria" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="h-px w-6 bg-brand-gold/60" />
        <p className="text-[10px] tracking-[0.45em] text-brand-gold uppercase">Esmalteria</p>
        <span className="h-px w-6 bg-brand-gold/60" />
      </div>
      <h1 className="font-script text-5xl text-brand-wine mt-2 leading-none">Juliana Cavalcanti</h1>
      {subtitle && <p className="text-sm text-brand-gray mt-3 italic font-serif">{subtitle}</p>}
    </div>
  );
}
