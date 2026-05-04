import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children, hideNav }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen bg-brand-rose-bg">
      <div className="mx-auto max-w-[480px] min-h-screen pb-24 px-4">
        {children}
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
