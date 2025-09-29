"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";

const ProgressBar = dynamic(() => import("@/components/ui/ProgressBar").then(mod => ({ default: mod.ProgressBar })), { 
  ssr: false 
});
// import { useAccount } from "wagmi";
// import { ConnectedState } from "@/components/wallet/ConnectedState";

const BackgroundEffects = dynamic(() => import("@/components/ui/BackgroundEffects").then(mod => ({ default: mod.BackgroundEffects })), { 
  ssr: false 
});

export default function Home() {
  //const { address } = useAccount();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative grid grid-rows-[1fr_auto] min-h-screen ml-64 mr-64 font-[family-name:var(--font-avenue-mono)] overflow-hidden">
      <BackgroundEffects />

      <main className="relative flex flex-col justify-between h-full z-10 text-white">
        {/* Top Section - Metrics */}
        <div className="flex justify-between w-full border-b border-[var(--color-border-accent)]">
          <div className="flex-1 text-center pb-7 pt-13 border-l border-[var(--color-border-accent)]">
            <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
              Total commissions
            </p>
            <p className="text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
              5 587
            </p>
          </div>
          <div className="flex-1 text-center pb-7 pt-13">
            <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
              Total bought
            </p>
            <p className="text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
              6 847
            </p>
          </div>
        </div>

        {/* Middle Section - Background Effects (already handled by BackgroundEffects component) */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex-1 h-full p-2"></div>
          <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
          <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
          <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
        </div>

        {/* Bottom Section - Progress Bar */}
        <div className="w-full">
          <ProgressBar percentage={75} className="p-2 border-b border-t border-[var(--color-border-accent)]" containerRef={containerRef} />
          
          {/* Labels - 4 equal cells */}
          <div className="flex w-full">
            <div className="flex-1 text-left p-2 pb-13">
              <span className="text-sm text-gray-300 font-[family-name:var(--font-martian-mono)]">
                0 ETH
              </span>
            </div>
            <div className="flex-1 border-l p-2 pb-13 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 border-l p-2 pb-13 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 text-right p-2 pb-13 border-l border-[var(--color-border-accent)]">
              <span className="text-sm text-right text-gray-300 font-[family-name:var(--font-martian-mono)]">
                1 ETH
              </span>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
