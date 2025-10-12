"use client";

import React, { useEffect } from 'react';
import AnimatedValue from '@/components/ui/AnimatedValue';
import { useReadContract } from 'wagmi';
import { contractConfig, formatTokenBalance } from '@/lib/contracts';

const TreasurySection: React.FC = () => {
  // Get PENGU balance from Treasury contract
  const { data: treasuryBalance, isLoading: isTreasuryLoading } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getContractBalance',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get total claimed dividends across all epochs
  const { data: totalClaimed, isLoading: isTotalClaimedLoading } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getTotalClaimedDividends',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });
  // Track loading states
  const [hasTreasuryLoaded, setHasTreasuryLoaded] = React.useState(false);
  const [hasTotalClaimedLoaded, setHasTotalClaimedLoaded] = React.useState(false);

  useEffect(() => {
    if (!isTreasuryLoading && treasuryBalance !== undefined) {
      setHasTreasuryLoaded(true);
    }
  }, [isTreasuryLoading, treasuryBalance]);

  useEffect(() => {
    if (!isTotalClaimedLoading && totalClaimed !== undefined) {
      setHasTotalClaimedLoaded(true);
    }
  }, [isTotalClaimedLoading, totalClaimed]);

  return (
    <div>
      <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
        Dividends Treasury
      </h2>
      
      {/* Treasury Data Panels */}
      <div className="flex w-full border-b border-[var(--color-border-accent)]">
        {/* Left Panel - Current holding */}
        <div className="flex-1 text-center pb-8 pt-8 border-r border-[var(--color-border-accent)]">
          <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
            Current dividends holding
          </p>
          <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            <AnimatedValue
              isLoading={!hasTreasuryLoaded}
              value={treasuryBalance ? formatTokenBalance(treasuryBalance, 18, 0) : '0'}
            />
          </p>
        </div>
        
        {/* Right Panel - Unclaimed dividends */}
        <div className="flex-1 text-center pb-8 pt-8">
          <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
            Total dividends<br className="lg:hidden" /> paid
          </p>
          <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            <AnimatedValue
              isLoading={!hasTotalClaimedLoaded}
              value={totalClaimed ? formatTokenBalance(totalClaimed) : '0'}
            />
          </p>
        </div>
      </div>
    </div>
  );
};

export default TreasurySection;
