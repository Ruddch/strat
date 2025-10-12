"use client";

import dynamic from "next/dynamic";
import React, { useRef, useEffect } from "react";
import { useScroll } from "@/contexts/ScrollContext";
import { OrientationLock } from "@/components/ui/OrientationLock";
import MetricsSection from "@/components/MetricsSection";
import TakeProfitTable from "@/components/TakeProfitTable";
import LastBuysTable from "@/components/LastBuysTable";
import TreasurySection from "@/components/TreasurySection";
import TradingSection from "@/components/TradingSection";
import { useReadContract } from "wagmi";
import { contractConfig } from "@/lib/contracts"; 

const ProgressBar = dynamic(() => import("@/components/ui/ProgressBar").then(mod => ({ default: mod.ProgressBar })), { 
  ssr: false 
});
// import { useAccount } from "wagmi";
// import { ConnectedState } from "@/components/wallet/ConnectedState";

const ResponsiveBackgroundEffects = dynamic(() => import("@/components/ui/ResponsiveBackgroundEffects").then(mod => ({ default: mod.ResponsiveBackgroundEffects })), { 
  ssr: false 
});


export default function Home() {
  //const { address } = useAccount();
  const containerRef = useRef<HTMLDivElement>(null);
  const tradingRef = useRef<HTMLDivElement>(null);
  const takeProfitRef = useRef<HTMLDivElement>(null);
  const lastBuysRef = useRef<HTMLDivElement>(null);
  const treasuryRef = useRef<HTMLDivElement>(null);
  const { setActiveSection } = useScroll();

  // Get FeeCollector config (threshold) and ETH balance for progress bar
  const { data: feeCollectorConfig, isLoading: isConfigLoading } = useReadContract({
    ...contractConfig.feeCollector,
    functionName: 'getConfig',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  const { data: feeCollectorETHBalance, isLoading: isETHBalanceLoading } = useReadContract({
    ...contractConfig.feeCollector,
    functionName: 'getETHBalance',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Calculate progress percentage
  const progressPercentage = React.useMemo(() => {
    if (!feeCollectorConfig || !feeCollectorETHBalance || isConfigLoading || isETHBalanceLoading) return 0;
    
    const [threshold] = feeCollectorConfig;
    const currentBalance = feeCollectorETHBalance;
    
    if (threshold === BigInt(0)) return 0;
    
    const percentage = Number((currentBalance * BigInt(100)) / threshold);
    return Math.min(percentage, 100);
  }, [feeCollectorConfig, feeCollectorETHBalance, isConfigLoading, isETHBalanceLoading]);


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            setActiveSection(sectionId);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    const sections = ['live', 'trading', 'take-profit', 'last-buys', 'treasury'];
    sections.forEach(sectionId => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [setActiveSection]);

  return (
    <OrientationLock>
      <div className="ml-0 mr-0 lg:ml-64 lg:mr-64 font-[family-name:var(--font-avenue-mono)] h-screen no-scrollbar overflow-y-scroll snap-y snap-mandatory">
      {/* First Section - Original Dashboard */}
      <div id="live" ref={containerRef} className="relative grid grid-rows-[1fr_auto] min-h-screen snap-start">
        <ResponsiveBackgroundEffects message="PENGU STRATEGY" mobileFontSize={30} desktopFontSize={200} />
        <main className="relative flex flex-col justify-between w-full h-full z-10 text-white">
          {/* Top Section - Metrics */}
          <MetricsSection />

          {/* Middle Section - Background Effects (already handled by BackgroundEffects component) */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex-1 h-full p-2"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
              <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]">
              </div>
          </div>

          {/* Bottom Section - Progress Bar */}
          <div className="w-full">
            <ProgressBar percentage={progressPercentage} className="p-2 border-b border-t border-[var(--color-border-accent)]" containerRef={containerRef} />
            
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

      {/* Second Section - Trading */}
      <div id="trading" ref={tradingRef} className="relative min-h-screen z-10 text-white snap-start">
        <TradingSection />
      </div>

      {/* Third Section - Take Profit */}
      <div id="take-profit" ref={takeProfitRef} className="relative min-h-screen z-10 text-white snap-start">
        <TakeProfitTable />
      </div>
      <div id="last-buys" ref={lastBuysRef} className="relative min-h-screen z-10 text-white snap-start">
        <LastBuysTable />
      </div>

      {/* Fourth Section - Treasury */}
      <div id="treasury" ref={treasuryRef} className="relative min-h-screen z-10 text-white snap-start">
        <TreasurySection />
      </div>
      </div>
    </OrientationLock>
  );
}
