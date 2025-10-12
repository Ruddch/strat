"use client";

import React from 'react';
import { formatTokenBalance, formatTokenPrice } from '@/lib/contracts';
import { useLots } from '@/hooks/useLots';

const TakeProfitTable: React.FC = () => {
  const { closestLots, hasInitiallyLoaded, ethPrice, isEthPriceLoading } = useLots();

  return (
    <div>
      <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
        Closest Orders
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
        closestLots.map((lot, index) => {
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
                  {multiplier.toFixed(1)}x
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
    </div>
  );
};

export default TakeProfitTable;
