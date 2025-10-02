"use client";

import { SignInButton } from "@/components/wallet/SignInButton";

export function RightNavigation() {

  return (
    <nav className="fixed top-0 right-0 bottom-0 w-64 z-50 pr-10">
      <div className="flex flex-col h-full p-2 pt-11 pb-11 border-l border-r border-[var(--color-border-accent)]">
        {/* Wallet Section - Top Right */}
        <div className="w-full">
          <SignInButton />
        </div>
      </div>
    </nav>
  );
}
