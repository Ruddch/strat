"use client";

import dynamic from "next/dynamic";
import React, { useRef, useEffect } from "react";
import { useScroll } from "@/contexts/ScrollContext";
import { OrientationLock } from "@/components/ui/OrientationLock";
import { useReadContract } from "wagmi";
import { contractConfig, formatTokenBalance, formatTokenPrice } from "@/lib/contracts";

// Types for lot data
interface Lot {
  amountPengu: bigint;
  ethSpent: bigint;
  avgPriceWeiPerPengu: bigint;
  timestamp: bigint;
  active: boolean;
}

interface LotWithId extends Lot {
  id: number;
}

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
  const takeProfitRef = useRef<HTMLDivElement>(null);
  const lastBuysRef = useRef<HTMLDivElement>(null);
  const treasuryRef = useRef<HTMLDivElement>(null);
  const { setActiveSection } = useScroll();

  // Get PENGU balance from Treasury contract
  const { data: treasuryBalance, isLoading: isTreasuryLoading } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getContractBalance',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get total claimed dividends across all epochs
  const { data: totalClaimed } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getTotalClaimedDividends',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get total ETH from fees collected from STRAT token trades
  const { data: totalETHFees, isLoading: isETHFeesLoading } = useReadContract({
    ...contractConfig.stratToken,
    functionName: 'getTotalETHFromFees',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get total PENGU purchased by FeeCollector
  const { data: totalPenguBought, isLoading: isPenguBoughtLoading } = useReadContract({
    ...contractConfig.feeCollector,
    functionName: 'getTotalPenguPurchased',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get all active lots from StrategyCore
  const { data: allLots, isLoading: isLotsLoading } = useReadContract({
    ...contractConfig.strategyCore,
    functionName: 'getAllActiveLots',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get current ETH price
  const [ethPrice, setEthPrice] = React.useState<number>(0);
  const [isEthPriceLoading, setIsEthPriceLoading] = React.useState(true);

  // Track initial loading states
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);
  const [hasTreasuryLoaded, setHasTreasuryLoaded] = React.useState(false);
  const [hasETHFeesLoaded, setHasETHFeesLoaded] = React.useState(false);
  const [hasPenguBoughtLoaded, setHasPenguBoughtLoaded] = React.useState(false);

  React.useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        setIsEthPriceLoading(true);
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum.usd);
      } catch (error) {
        console.error('Error fetching ETH price:', error);
        setEthPrice(0);
      } finally {
        setIsEthPriceLoading(false);
      }
    };

    fetchEthPrice();
    // Update price every 30 seconds
    const interval = setInterval(fetchEthPrice, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Track when data has initially loaded
  React.useEffect(() => {
    console.log('isLotsLoading', isLotsLoading);
    console.log('allLots', allLots);
    if (!isLotsLoading && allLots !== undefined) {
      setHasInitiallyLoaded(true);
    }
  }, [isLotsLoading, allLots]);

  React.useEffect(() => {
    if (!isTreasuryLoading && treasuryBalance !== undefined) {
      setHasTreasuryLoaded(true);
    }
  }, [isTreasuryLoading, treasuryBalance]);

  React.useEffect(() => {
    if (!isETHFeesLoading && totalETHFees !== undefined) {
      setHasETHFeesLoaded(true);
    }
  }, [isETHFeesLoading, totalETHFees]);

  React.useEffect(() => {
    if (!isPenguBoughtLoading && totalPenguBought !== undefined) {
      setHasPenguBoughtLoaded(true);
    }
  }, [isPenguBoughtLoading, totalPenguBought]);

  // Get 4 lots closest to sale (lowest avgPriceWeiPerPengu)
  const closestLots = React.useMemo((): LotWithId[] => {
    if (!allLots || isLotsLoading) return [];
    
    try {
      const [lotIds, lots] = allLots as [bigint[], Lot[]];
      
      // Create array with lot data and sort by avgPriceWeiPerPengu (ascending)
      const lotsWithIds: LotWithId[] = lotIds.map((id, index) => {
        const lot = lots[index];
        return {
          id: Number(id),
          ...lot
        };
      }).sort((a, b) => {
        if (a.avgPriceWeiPerPengu < b.avgPriceWeiPerPengu) return -1;
        if (a.avgPriceWeiPerPengu > b.avgPriceWeiPerPengu) return 1;
        return 0;
      });
      
      // Return first 4 lots
      return lotsWithIds.slice(0, 4);
    } catch (error) {
      console.error('Error processing lots:', error);
      return [];
    }
  }, [allLots, isLotsLoading]);

  const lastBuys = React.useMemo((): LotWithId[] => {
    if (!allLots || isLotsLoading) return [];
    
    try {
      const [lotIds, lots] = allLots as [bigint[], Lot[]];
      
      // Create array with lot data and sort by avgPriceWeiPerPengu (ascending)
      const lotsWithIds: LotWithId[] = lotIds.map((id, index) => {
        const lot = lots[index];
        return {
          id: Number(id),
          ...lot
        };
      }).sort((a, b) => {
        if (a.timestamp > b.timestamp) return -1;
        if (a.timestamp < b.timestamp) return 1;
        return 0;
      });
      
      // Return first 4 lots
      return lotsWithIds.slice(0, 4);
    } catch (error) {
      console.error('Error processing lots:', error);
      return [];
    }
  }, [allLots, isLotsLoading]);

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

    const sections = ['live', 'take-profit', 'last-buys', 'treasury'];
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
        <ResponsiveBackgroundEffects mobileFontSize={30} desktopFontSize={200} />
        <main className="relative flex flex-col justify-between w-full h-full z-10 text-white">
          {/* Top Section - Metrics */}
          <div className="flex justify-between w-full border-b border-[var(--color-border-accent)]">
            <div className="flex-1 text-center pb-7 pt-13 border-r border-[var(--color-border-accent)]">
              <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
                Total ETH commissions
              </p>
                <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                  {!hasETHFeesLoaded ? '...' : totalETHFees ? formatTokenBalance(totalETHFees) : '0'}
                </p>
            </div>
            <div className="flex-1 text-center pb-7 pt-13">
              <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
                Total PENGU bought
              </p>
                <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                  {!hasPenguBoughtLoaded ? '...' : totalPenguBought ? formatTokenBalance(totalPenguBought) : '0'} 
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

      {/* Second Section - Take Profit */}
      <div id="take-profit" ref={takeProfitRef} className="relative min-h-screen z-10 text-white snap-start">
        <div>
          <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
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
             {!hasInitiallyLoaded ? (
               <div className="flex pt-8 pb-8 w-full">
                 <div className="flex-1 py-8 text-center p-8">
                   <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                     Loading...
                   </span>
                 </div>
               </div>
             ) : closestLots.length === 0 ? (
               <div className="flex pt-8 pb-8 w-full">
                 <div className="flex-1 py-8 text-center p-8">
                   <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                     No active lots
                   </span>
                 </div>
               </div>
             ) : (
               closestLots.map((lot, index) => {
                 // Calculate multiplier (current price / avg price)
                 const multiplier = 1.2; 
                 
                 // Calculate predicted gain (simplified)
                 const predictedGain = isEthPriceLoading ? 0 : Number(formatTokenBalance(lot.ethSpent)) * multiplier * ethPrice;
                 
                 return (
                   <div key={lot.id} className={`flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
                     <div className="flex-1 text-left p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                       <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                         {formatTokenBalance(lot.amountPengu)}
                       </span>
                     </div>
                     <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                       <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                         {formatTokenBalance(lot.avgPriceWeiPerPengu)}
                       </span>
                     </div>
                     <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                       <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                         {multiplier.toFixed(1)}x
                       </span>
                     </div>
                     <div className="flex-1 p-2 pb-8 pt-8 border-l border-b border-[var(--color-border-accent)]">
                       <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
                         +{predictedGain.toFixed(0)}
                       </span>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

        <div id="last-buys" ref={lastBuysRef} className="relative min-h-screen z-10 text-white snap-start">
          <div>
            <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
              Last Buys
            </h2>
            
            {/* Last Buys Table */}
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
            {!hasInitiallyLoaded ? (
              <div className="flex pt-8 pb-8 w-full">
                <div className="flex-1 py-8 text-center p-8">
                  <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                    Loading...
                  </span>
                </div>
              </div>
            ) : lastBuys.length === 0 ? (
              <div className="flex pt-8 pb-8 w-full">
                <div className="flex-1 py-8 text-center p-8">
                  <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                    No active lots
                  </span>
                </div>
              </div>
            ) : (
              lastBuys.map((lot, index) => {
                // Calculate multiplier (current price / avg price)
                const multiplier = 1.2; 
                
                // Calculate predicted gain (simplified)
                const predictedGain = isEthPriceLoading ? 0 : Number(formatTokenBalance(lot.ethSpent)) * multiplier * ethPrice;
                
                return (
                  <div key={lot.id} className={`flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
                    <div className="flex-1 text-left p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                      <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                        {formatTokenBalance(lot.amountPengu)}
                      </span>
                    </div>
                    <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                      <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                        {formatTokenPrice(lot.avgPriceWeiPerPengu)}
                      </span>
                    </div>
                    <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                      <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                        {multiplier.toFixed(2)}x
                      </span>
                    </div>
                    <div className="flex-1 p-2 pb-8 pt-8 border-l border-b border-[var(--color-border-accent)]">
                      <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
                        +{predictedGain.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      {/* Third Section - Treasury */}
      <div id="treasury" ref={treasuryRef} className="relative min-h-screen z-10 text-white snap-start">
        <div>
          <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            Treasury
          </h2>
          
          {/* Treasury Data Panels */}
          <div className="flex w-full border-b border-[var(--color-border-accent)]">
            {/* Left Panel - Current holding */}
            <div className="flex-1 text-center pb-8 pt-8 border-r border-[var(--color-border-accent)]">
              <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
                Current holding
              </p>
              <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                {!hasTreasuryLoaded ? '...' : treasuryBalance ? formatTokenBalance(treasuryBalance) : '0'}
              </p>
            </div>
            
            {/* Right Panel - Unclaimed dividends */}
            <div className="flex-1 text-center pb-8 pt-8">
              <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
                Total dividends paid
              </p>
              <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                {!hasTreasuryLoaded ? '...' : totalClaimed ? formatTokenBalance(totalClaimed) : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </OrientationLock>
  );
}
