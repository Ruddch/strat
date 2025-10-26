"use client";

import { SignInButton } from "@/components/wallet/SignInButton";

export function RightNavigation() {
  const iconSize = 24;

  return (
    <nav className="fixed top-0 right-0 bottom-0 w-64 z-50 pr-10 hidden lg:block">
      <div className="flex flex-col h-full p-2 pt-11 pb-11 border-l border-r border-[var(--color-border-accent)]">
        {/* Wallet Section - Top Right */}
        <div className="w-full">
          <SignInButton />
        </div>

        {/* Social Links - Bottom */}
        <div className="mt-auto flex flex-row items-center justify-center space-x-6">
          <a
            href="https://x.com/PudgyInvest"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a
            href="https://t.me/pudgyinvestsafeguard"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.894 6.221l-1.803 8.467c-.133.584-.472.73-.957.453l-2.646-1.948-1.277 1.224c-.145.145-.268.265-.549.265l.197-2.785 4.943-4.459c.217-.19.018-.294-.337-.106l-6.105 3.847-2.628-.815c-.578-.184-.59-.578.12-.865l10.284-3.958c.479-.177.896.112.737.858z"/>
            </svg>
          </a>
          <a
            href="https://dexscreener.com/abstract/0x881c97da8146aae6bc04437a36b0da37d89a8530"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity cursor-pointer"
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round"/>
              <line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round"/>
              <line x1="3" y1="9" x2="21" y2="9" strokeLinecap="round"/>
              <path d="M9 15L12 12L15 15" strokeLinecap="round"/>
              <path d="M9 12L12 15L15 12" strokeLinecap="round"/>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}
