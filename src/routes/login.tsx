import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { BrandHeader } from "@/components/brand-header";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Juliana");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (session) navigate({ to: "/dashboard" }); }, [session, navigate]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setLoading(false);
    if (res.error) toast.error(res.error);
    else if (mode === "signup") toast.success("Conta criada! Entrando...");
  };

  return (
    <div className="min-h-screen bg-brand-rose-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-brand-cream rounded-3xl p-8 shadow-sm border border-brand-border/50">
        <BrandHeader />
        <form onSubmit={handle} className="space-y-4 mt-2">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-brand-wine hover:bg-brand-wine/90 text-brand-cream rounded-xl h-12 text-base">
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-sm text-brand-wine/80 hover:text-brand-wine">
            {mode === "signin" ? "Primeiro acesso? Criar conta" : "Já tenho conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
