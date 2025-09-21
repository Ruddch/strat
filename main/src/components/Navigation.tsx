"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { SignInButton } from "@/components/wallet/SignInButton";

export function Navigation() {
  const pathname = usePathname();
  const { address } = useAccount();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex space-x-8">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "text-white bg-white/10"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Home
            </Link>
            <Link
              href="/claim"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/claim"
                  ? "text-white bg-white/10"
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
            >
              Claim
            </Link>
          </div>
          
          <div className="flex items-center">
            {address ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
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
      </div>
    </nav>
  );
}
