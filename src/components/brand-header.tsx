import logo from "@/assets/logo-juliana.jpeg";

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-brand-coral bg-brand-cream shadow-sm">
        <img src={logo} alt="Juliana Cavalcanti Esmalteria" className="w-full h-full object-cover" />
      </div>
      <h1 className="font-serif italic text-3xl text-brand-wine mt-3 leading-tight">Juliana Cavalcanti</h1>
      <p className="text-xs tracking-[0.3em] text-brand-gray mt-1">ESMALTERIA</p>
      {subtitle && <p className="text-sm text-brand-gray mt-2">{subtitle}</p>}
    </div>
  );
}
