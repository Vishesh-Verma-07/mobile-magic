"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ReactNode } from "react";

type AppHeaderProps = {
  action?: ReactNode;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

export function AppHeader({
  action,
  isSidebarOpen,
  onToggleSidebar,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="flex h-13 w-full items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="mr-0.5 flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose size={16} strokeWidth={2} />
              ) : (
                <PanelLeftOpen size={16} strokeWidth={2} />
              )}
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="grid size-7.5 place-items-center rounded-lg border border-slate-300 bg-slate-900 text-[9px] font-bold tracking-[0.12em] text-white">
              BM
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-900">
                Bolt Mobile
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {action ? (
            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
          ) : null}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              >
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="scale-90 transform">
              <UserButton />
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
