"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";

type AppHeaderProps = {
  action?: ReactNode;
};

export function AppHeader({ action }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-800">
          Bolt Mobile
        </p>
        <div className="flex items-center gap-3">
          {action}
          <Show when="signed-out">
            <SignInButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
