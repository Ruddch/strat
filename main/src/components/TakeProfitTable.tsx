"use client";

import React, { useState } from 'react';
import { formatTokenBalance, formatTokenPrice } from '@/lib/contracts';
import { useLots } from '@/hooks/useLots';

const TakeProfitTable: React.FC = () => {
  const { closestLots, hasInitiallyLoaded, ethPrice, isEthPriceLoading } = useLots();
  const [showAll, setShowAll] = useState(false);
  
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
          
          return (
            <div key={lot.id} className={`flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
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
                <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
                  ${predictedGain.toFixed(2)}
                </span>
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
              Total Pengu Amount
            </span>
          </div>
          <div className="flex-1 p-2">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              
            </span>
          </div>
          <div className="flex-1 p-2">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              
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
              
            </span>
          </div>
          <div className="flex-1 p-2 pb-8 pt-8 border-l border-[var(--color-border-accent)]">
            <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
              ${closestLots.reduce((total, lot) => {
                const ethSpentNumber = Number(lot.ethSpent) / 1e18;
                const predictedGain = isEthPriceLoading ? 0 : ethSpentNumber * 1.1 * ethPrice;
                return total + predictedGain;
              }, 0).toFixed(2)}
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
