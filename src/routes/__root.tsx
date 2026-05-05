import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-rose-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-script text-brand-wine">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-brand-wine">Página não encontrada</h2>
        <p className="mt-2 text-sm text-brand-gray">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-brand-wine px-5 py-2.5 text-sm font-medium text-brand-cream">
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
