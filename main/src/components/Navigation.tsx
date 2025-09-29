"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { SignInButton } from "@/components/wallet/SignInButton";

export function Navigation() {
  const pathname = usePathname();
  const { address } = useAccount();

  return (
    <nav className="fixed top-0 left-0 bottom-0 w-64 z-50 pl-10">
      <div className="flex flex-col h-full p-2 pt-11 pb-11 border-l border-r border-[var(--color-border-accent)]">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-[20px] w-41 font-light leading-[150%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-martian-mono)]">
            PENGU<br/>STRATEGY
          </h1>
          
          {/* Navigation Links */}
          <div className="mt-6 space-y-8">
            <a 
              href="#live" 
              className="block text-[14px] font-light leading-[150%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity"
            >
              Live
            </a>
            <a 
              href="#take-profit" 
              className="block text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity"
            >
              Take Profit
            </a>
            <a 
              href="#treasury" 
              className="block text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity"
            >
              Treasury
            </a>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-8 flex-1">
          <Link
            href="/"
            className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity ${
              pathname === "/"
                ? "text-[var(--color-text-accent)]"
                : "text-white"
            }`}
          >
            Home
          </Link>
          <Link
            href="/claim"
            className={`block text-[14px] font-light leading-[150%] tracking-[0%] font-[family-name:var(--font-martian-mono)] hover:opacity-80 transition-opacity ${
              pathname === "/claim"
                ? "text-[var(--color-text-accent)]"
                : "text-white"
            }`}
          >
            Claim
          </Link>
        </div>
        
        {/* Wallet Section */}
        <div className="mt-auto">
          {address ? (
            <div className="flex flex-col gap-3">
              <div className="text-left">
                <p className="text-sm text-white font-[family-name:var(--font-roobert)]">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
              <SignInButton />
            </div>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </nav>
  );
}
