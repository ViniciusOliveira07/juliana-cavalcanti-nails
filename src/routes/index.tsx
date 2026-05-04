import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-wine border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <Navigate to={session ? "/dashboard" : "/agendar"} />;
}
