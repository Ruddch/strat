"use client";

import React, { useState, useEffect } from 'react';
import { formatTokenBalance, formatTokenPrice, CONTRACT_ADDRESSES } from '@/lib/contracts';
import { useLots } from '@/hooks/useLots';

const TakeProfitTable: React.FC = () => {
  const { closestLots, hasInitiallyLoaded, ethPrice, isEthPriceLoading } = useLots();
  const [showAll, setShowAll] = useState(false);
  
  // PENGU price state
  const [penguPrice, setPenguPrice] = useState<number>(0);
  const [isPenguPriceLoading, setIsPenguPriceLoading] = useState(true);
  
  // Fetch PENGU price from DEXScreener
  useEffect(() => {
    const fetchPenguPrice = async () => {
      try {
        setIsPenguPriceLoading(true);
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESSES.PENGU_TOKEN}`);
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
          // Find the specific pair with address 0xb560B29f35ab7b3517F3F2186a4552FF4978369b
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const targetPair = data.pairs.find((pair: any) => 
            pair.pairAddress?.toLowerCase() === '0xb560B29f35ab7b3517F3F2186a4552FF4978369b'.toLowerCase()
          );
          
          if (targetPair) {
            console.log('Target pair found:', targetPair);
            console.log('Price native:', targetPair.priceNative);
            setPenguPrice(parseFloat(targetPair.priceNative || '0'));
          } else {
            console.log('Target pair not found, using first available pair');
            // Fallback to first pair if target pair not found
            const firstPair = data.pairs[0];
            setPenguPrice(parseFloat(firstPair.priceNative || '0'));
          }
        } else {
          setPenguPrice(0);
        }
      } catch (error) {
        console.error('Error fetching PENGU price:', error);
        setPenguPrice(0);
      } finally {
        setIsPenguPriceLoading(false);
      }
    };

    fetchPenguPrice();
    // Update price every 60 seconds
    const interval = setInterval(fetchPenguPrice, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Calculate PENGU price in ETH
  const calculatePenguPriceInEth = (): string => {
    if (isPenguPriceLoading || isEthPriceLoading || penguPrice === 0 || ethPrice === 0) {
      return '0.0000';
    }
    
    const penguPriceInEth = penguPrice;
    // Convert to wei (18 decimals) for formatTokenPrice
    const penguPriceInEthWei = BigInt(Math.floor(penguPriceInEth * 1e18));
    return formatTokenPrice(penguPriceInEthWei, 18);
  };
  
  const visibleLots = showAll ? closestLots : closestLots.slice(0, 4);

  return (
    <div>
      <div className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] flex justify-between items-center">
        <h2 className="text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
          Upcoming Sales
        </h2>
        <a 
          href="https://abscan.org/address/0xfad5bbdc406888c026312c6108a7f9258631b4c9" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[14px] font-light leading-[150%] tracking-[0%] text-white hover:text-[var(--color-text-accent)] transition-colors duration-200 font-[family-name:var(--font-martian-mono)] underline"
        >
          View Contract
        </a>
      </div>
      
      {/* Take Profit Table */}
      <div className="flex w-full border-b border-[var(--color-border-accent)]">
        <div className="flex-1 text-left p-2">
          <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
            PENGU amount
          </span>
        </div>
        <div className="flex-1 p-2">
          <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
            ETH buy Price
          </span>
        </div>
        <div className="flex-1 p-2">
          <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
            ETH sell Price
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
        <div className="flex w-full justify-center p-8 border-b border-[var(--color-border-accent)]">
          <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
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
        visibleLots.map((lot, index) => {
          // Calculate multiplier (current price / avg price)
          const multiplier = 1.1; 
          
          // Calculate predicted gain (simplified)
          // Convert bigint to number for calculation, then back to string for display
          const ethSpentNumber = Number(lot.ethSpent) / 1e18; // Convert from wei to ETH
          const predictedGain = isEthPriceLoading ? 0 : ethSpentNumber * multiplier * ethPrice;
          
          // Calculate progress from buy price to sell price
          const buyPrice = Number(lot.avgPriceWeiPerPengu) / 1e18;
          const sellPrice = Number((lot.avgPriceWeiPerPengu * BigInt(110)) / BigInt(100)) / 1e18;
          const currentPrice = isPenguPriceLoading ? 0 : penguPrice;
          
          // Calculate progress percentage (0-100%) with easing curve
          let progressPercentage = 0;
          if (sellPrice > buyPrice && currentPrice >= buyPrice) {
            const linearProgress = Math.min(100, Math.max(0, ((currentPrice - buyPrice) / (sellPrice - buyPrice)) * 100));
            progressPercentage = 1 - Math.pow(1 - linearProgress / 100, 3);
            progressPercentage = Math.min(100, Math.max(0, progressPercentage * 100));
          }
          
          return (
            <div key={lot.id} className="relative overflow-hidden">
              {/* Progress Bar Background */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-[rgba(96,255,255,0.1)] to-[rgba(0,255,0,0.1)] transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
              
              {/* Table Row Content */}
              <div className={`relative flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
                <div className="flex-1 text-left p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                  <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                    {formatTokenBalance(lot.amountPengu, 18, 0)}
                  </span>
                </div>
                <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                  <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                    {formatTokenPrice(lot.avgPriceWeiPerPengu)}
                  </span>
                </div>
                <div className="flex-1 border-l p-2 pb-8 pt-8 border-b border-[var(--color-border-accent)]">
                  <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
                    {formatTokenPrice((lot.avgPriceWeiPerPengu * BigInt(110)) / BigInt(100))}
                  </span>
                </div>
                <div className="flex-1 p-2 pb-8 pt-8 border-l border-b border-[var(--color-border-accent)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
                      ${predictedGain.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      
      {/* Total Summary */}
      {hasInitiallyLoaded && closestLots.length > 0 && (
        <div className="flex w-full">
          <div className="flex-1 text-left border-r border-[var(--color-border-accent)] p-2">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              Total PENGU Amount
            </span>
          </div>
          <div className="flex-1 p-2">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              
            </span>
          </div>
          <div className="flex-1 p-2 border-l border-[var(--color-border-accent)]">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              Current PENGU price (ETH)
            </span>
          </div>
          <div className="flex-1 p-2 border-l border-[var(--color-border-accent)]">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              Total Predicted Gain
            </span>
          </div>
        </div>
      )}
      
      {/* Total Values */}
      {hasInitiallyLoaded && closestLots.length > 0 && (
        <div className="flex w-full border-t border-b border-[var(--color-border-accent)]">
          <div className="flex-1 text-left p-2 pb-8 pt-8">
            <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
              {formatTokenBalance(
                closestLots.reduce((total, lot) => total + lot.amountPengu, BigInt(0)),
                18,
                0
              )}
            </span>
          </div>
          <div className="flex-1 border-l border-[var(--color-border-accent)] p-2 pb-8 pt-8">
            <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
              
            </span>
          </div>
          <div className="flex-1 p-2 pb-8 pt-8">
            <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-white font-[family-name:var(--font-random-grotesque)]">
              {isPenguPriceLoading || isEthPriceLoading ? (
                <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                `${calculatePenguPriceInEth()}`
              )}
            </span>
          </div>
          <div className="flex-1 p-2 pb-8 pt-8 border-l border-[var(--color-border-accent)]">
            <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
              ${closestLots.reduce((total, lot) => {
                const ethSpentNumber = Number(lot.ethSpent) / 1e18;
                const predictedGain = isEthPriceLoading ? 0 : ethSpentNumber * 1.1 * ethPrice;
                return total + predictedGain;
              }, 0).toFixed(0)}
            </span>
          </div>
        </div>
      )}
      
      {/* Show More Button */}
      {hasInitiallyLoaded && closestLots.length > 4 && (
        <div className="flex w-full justify-center p-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-2 bg-transparent border border-[var(--color-border-accent)] text-white hover:bg-[rgba(96,255,255,0.1)] transition-colors duration-200 font-[family-name:var(--font-martian-mono)] text-[14px] cursor-pointer"
          >
            {showAll ? 'Show Less' : `Show More (${closestLots.length - 4} more)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default TakeProfitTable;
