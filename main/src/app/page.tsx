"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect } from "react";
import { useScroll } from "@/contexts/ScrollContext";

const ProgressBar = dynamic(() => import("@/components/ui/ProgressBar").then(mod => ({ default: mod.ProgressBar })), { 
  ssr: false 
});
// import { useAccount } from "wagmi";
// import { ConnectedState } from "@/components/wallet/ConnectedState";

const BackgroundEffects = dynamic(() => import("@/components/ui/BackgroundEffects").then(mod => ({ default: mod.BackgroundEffects })), { 
  ssr: false 
});

const orders = [
  {
    id: 1,
    amount: 2485,
    price: 547.15,
    multiplier: 1.2,
    predictedGain: 247
  },
  {
    id: 2,
    amount: 2485,
    price: 547.15,
    multiplier: 1.2,
    predictedGain: 247
  },
  {
    id: 3,
    amount: 2485,
    price: 547.15,
    multiplier: 1.2,
    predictedGain: 247
  }
]

export default function Home() {
  //const { address } = useAccount();
  const containerRef = useRef<HTMLDivElement>(null);
  const takeProfitRef = useRef<HTMLDivElement>(null);
  const treasuryRef = useRef<HTMLDivElement>(null);
  const { setActiveSection } = useScroll();

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

    const sections = ['live', 'take-profit', 'treasury'];
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
    <div className="ml-64 mr-64 font-[family-name:var(--font-avenue-mono)] h-screen no-scrollbar overflow-y-scroll snap-y snap-mandatory">
      {/* First Section - Original Dashboard */}
      <div id="live" ref={containerRef} className="relative grid grid-rows-[1fr_auto] min-h-screen snap-start">
        <BackgroundEffects />
        <main className="relative flex flex-col justify-between w-full h-full z-10 text-white">
          {/* Top Section - Metrics */}
          <div className="flex justify-between w-full border-b border-[var(--color-border-accent)]">
            <div className="flex-1 text-center pb-7 pt-13 border-r border-[var(--color-border-accent)]">
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
              <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]">
              </div>
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

      {/* Second Section - Take Profit */}
      <div id="take-profit" ref={takeProfitRef} className="relative min-h-screen z-10 text-white snap-start">
        <div>
          <h2 className="pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            Take Profit
          </h2>
          
          {/* Take Profit Table */}
          <div className="flex w-full border-b border-[var(--color-border-accent)]">
              <div className="flex-1 text-left p-2">
                <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                  PENGU amount
                </span>
              </div>
              <div className="flex-1 p-2">
                <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                  Price
                </span>
              </div>
              <div className="flex-1 p-2">
                <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                  Multiplier
                </span>
              </div>
              <div className="flex-1 p-2">
                <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                  Predicted Gain
                </span>
              </div>
          </div>
            
            {/* Table Rows */}
             {orders.map((order, index) => (
               <div key={order.id} className={`flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
                 <div key={order.id} className="flex-1 text-left p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                   <span className="text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                     {order.amount}
                   </span>
                 </div>
                 <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                   <span className="text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                     {order.price}
                   </span>
                 </div>
                 <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                   <span className="text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                     {order.multiplier}x
                   </span>
                 </div>
                 <div className="flex-1 p-2 pb-8 pt-8 border-l border-b border-[var(--color-border-accent)]">
                   <span className="text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
                     +{order.predictedGain}
                   </span>
                 </div>
               </div>
             ))}
          </div>
        </div>

      {/* Third Section - Treasury */}
      <div id="treasury" ref={treasuryRef} className="relative min-h-screen z-10 text-white snap-start">
        <div>
          <h2 className="pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            Treasury
          </h2>
          
          {/* Treasury Data Panels */}
          <div className="flex w-full border-b border-[var(--color-border-accent)]">
            {/* Left Panel - Current holding */}
            <div className="flex-1 text-center pb-8 pt-8 border-r border-[var(--color-border-accent)]">
              <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
                Current holding
              </p>
              <p className="text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                1 587
              </p>
            </div>
            
            {/* Right Panel - Total dividends paid */}
            <div className="flex-1 text-center pb-8 pt-8">
              <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
                Total dividends paid
              </p>
              <p className="text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                12 587
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
