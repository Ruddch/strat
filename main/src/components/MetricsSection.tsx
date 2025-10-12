"use client";

import React, { useEffect } from 'react';
import AnimatedValue from '@/components/ui/AnimatedValue';
import { useReadContract } from 'wagmi';
import { contractConfig, formatTokenBalance } from '@/lib/contracts';

const MetricsSection: React.FC = () => {
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

  // Track loading states
  const [hasETHFeesLoaded, setHasETHFeesLoaded] = React.useState(false);
  const [hasPenguBoughtLoaded, setHasPenguBoughtLoaded] = React.useState(false);

  useEffect(() => {
    if (!isETHFeesLoading && totalETHFees !== undefined) {
      setHasETHFeesLoaded(true);
    }
  }, [isETHFeesLoading, totalETHFees]);

  useEffect(() => {
    if (!isPenguBoughtLoading && totalPenguBought !== undefined) {
      setHasPenguBoughtLoaded(true);
    }
  }, [isPenguBoughtLoading, totalPenguBought]);
  return (
    <div className="flex justify-between w-full border-b border-[var(--color-border-accent)]">
      <div className="flex-1 text-center pb-7 pt-13 border-r border-[var(--color-border-accent)]">
        <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
          Total ETH commissions
        </p>
        <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
          <AnimatedValue
            isLoading={!hasETHFeesLoaded}
            value={totalETHFees ? formatTokenBalance(totalETHFees) : '0'}
          />
        </p>
      </div>
      <div className="flex-1 text-center pb-7 pt-13">
        <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
          Total PENGU bought
        </p>
        <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
          <AnimatedValue
            isLoading={!hasPenguBoughtLoaded}
            value={totalPenguBought ? formatTokenBalance(totalPenguBought, 18, 0) : '0'}
          />
        </p>
      </div>
    </div>
  );
};

export default MetricsSection;
