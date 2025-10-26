"use client";

import React, { useEffect, useState } from 'react';
import AnimatedValue from '@/components/ui/AnimatedValue';
import { useReadContract } from 'wagmi';
import { contractConfig, formatTokenBalance, CONTRACT_ADDRESSES } from '@/lib/contracts';
import Link from 'next/link';

const TreasurySection: React.FC = () => {
  // Get current epoch ID
  const { data: currentEpochId } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'currentEpoch',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get epoch info for current epoch
  const { data: epochInfo, isLoading: isEpochInfoLoading } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getEpochInfo',
    args: currentEpochId ? [currentEpochId] : undefined,
    query: {
      enabled: !!currentEpochId,
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

  // Get PENGU price from DEXScreener
  const [penguPrice, setPenguPrice] = useState<number>(0);

  // Track loading states
  const [hasEpochInfoLoaded, setHasEpochInfoLoaded] = React.useState(false);
  const [hasTotalClaimedLoaded, setHasTotalClaimedLoaded] = React.useState(false);
  const [hasPenguPriceLoaded, setHasPenguPriceLoaded] = React.useState(false);

  useEffect(() => {
    if (!isEpochInfoLoading && epochInfo !== undefined) {
      setHasEpochInfoLoaded(true);
    }
  }, [isEpochInfoLoading, epochInfo]);

  useEffect(() => {
    if (!isTotalClaimedLoading && totalClaimed !== undefined) {
      setHasTotalClaimedLoaded(true);
    }
  }, [isTotalClaimedLoading, totalClaimed]);

  // Fetch PENGU price from DEXScreener
  useEffect(() => {
    const fetchPenguPrice = async () => {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESSES.PENGU_TOKEN}`);
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
          // Find the pair with highest liquidity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bestPair = data.pairs.reduce((prev: any, current: any) => 
            parseFloat(prev.liquidity?.usd || '0') > parseFloat(current.liquidity?.usd || '0') ? prev : current
          );
          setPenguPrice(parseFloat(bestPair.priceUsd || '0'));
        } else {
          setPenguPrice(0);
        }
      } catch (error) {
        console.error('Error fetching PENGU price:', error);
        setPenguPrice(0);
      } finally {
        setHasPenguPriceLoaded(true);
      }
    };

    fetchPenguPrice();
    // Update price every 60 seconds
    const interval = setInterval(fetchPenguPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Extract total dividends from epoch info
  const totalDividends = epochInfo ? epochInfo[2] : undefined; // totalDividends is at index 2

  // Calculate USD values
  const calculateUSDValue = (penguAmount: bigint | undefined, price: number): string => {
    if (!penguAmount || !price || !hasPenguPriceLoaded) return '0.00';
    
    const penguAmountFloat = parseFloat(formatTokenBalance(penguAmount, 18, 6));
    
    const usdValue = penguAmountFloat * price;
    return usdValue.toFixed(0);
  };

  const treasuryUSDValue = calculateUSDValue(totalDividends, penguPrice);

  return (
    <div>
      <div className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] flex justify-between items-center">
        <h2 className="text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
          Holders Dividends
        </h2>
        <a 
          href="https://abscan.org/address/0x2fafa047a6174705460732f42854dac966686263"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-light leading-[150%] tracking-[0%] text-white hover:text-[var(--color-text-accent)] transition-colors font-[family-name:var(--font-martian-mono)] underline underline-offset-2"
        >
          View Contract
        </a>
      </div>
      
      {/* Treasury Data Panels */}
      <div className="flex w-full border-b border-[var(--color-border-accent)]">
        {/* Left Panel - Current holding */}
        <div className="flex-1 text-center pb-8 pt-8 border-r border-[var(--color-border-accent)]">
          <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
            Current epoch dividends
          </p>
          <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            <AnimatedValue
              isLoading={!hasEpochInfoLoaded}
              value={totalDividends ? formatTokenBalance(totalDividends, 18, 0) : '0'}
            />
          </p>
        </div>
        
        {/* Right Panel - Total dividends paid */}
        <div className="flex-1 text-center pb-8 pt-8">
          <p className="text-[14px] font-light leading-[150%] tracking-[0%] text-white mb-2 font-[family-name:var(--font-martian-mono)]">
            Total dividends<br className="lg:hidden" /> paid
          </p>
          <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
            <AnimatedValue
              isLoading={!hasTotalClaimedLoaded}
              value={totalClaimed ? formatTokenBalance(totalClaimed, 18, 0) : '0'}
            />
          </p>
        </div>
      </div>
      
      {/* Treasury USD Value Block */}
      <div className="w-full border-b border-[var(--color-border-accent)]">
        <div className="p-6 flex justify-center items-center">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              This epoch 
            </span>
            <span className="text-[48px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[#00FF00] font-[family-name:var(--font-random-grotesque)]">
              <AnimatedValue
                isLoading={!hasEpochInfoLoaded || !hasPenguPriceLoaded}
                value={`$${treasuryUSDValue}`}
              />
            </span>
            <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
              will be distributed 
            </span>
          </div>
        </div>
      </div>
      
      {/* Dividends Explanation */}
      <div className="w-full border-b border-[var(--color-border-accent)]" style={{backgroundColor: 'rgba(96,255,255,0.05)'}}>
        <div className="p-8">
          <div className="text-left max-w-[570px]">
            <h3 className="text-[20px] text-white mb-4 font-[family-name:var(--font-martian-mono)]">
              <span className="text-[var(--color-text-accent)]">Dividends every epoch</span>
            </h3>
            <ul className="text-[14px] font-light leading-[180%] font-[family-name:var(--font-martian-mono)] space-y-2 list-none">
              <li className="flex items-start">
                <span className="text-white pr-2 mt-0.5">—</span> 
                <span><span className="text-[16px] text-[var(--color-text-accent)] font-normal">30%</span> of all $PENGU bought is distributed to holders as dividends.</span>
              </li>
              <li className="flex items-start">
                <span className="text-white pr-2 mt-0.5">—</span>
                <span>Epoch = <span className="text-[16px] text-[var(--color-text-accent)] font-normal">7 days</span>. Final snapshot is on Sunday.</span>
              </li>
              <li className="flex items-start">
                <span className="text-white pr-2 mt-0.5">—</span>
                <span>Your share scales with how many $PST you hold and how many days you hold during the epoch.</span>
              </li>
              <li className="flex items-start">
                <span className="text-white pr-2 mt-0.5">—</span>
                <span>Hold continuously to maximize your payout.</span>
              </li>
              <li className="flex items-start">
                <span className="text-white pr-2 mt-0.5">—</span>
                <span>
                  <Link 
                    href="/claim"
                    className="text-[var(--color-text-accent)] hover:opacity-80 transition-opacity cursor-pointer underline decoration-[var(--color-text-accent)] underline-offset-2"
                  >
                    Claim
                  </Link> opens right after the epoch ends.
                </span>
              </li>
            </ul>
            <div className="mt-6 p-2 bg-gray-800/30 border-2 border-[var(--color-border-accent)] rounded">
              <p className="text-[13px] font-light text-white font-[family-name:var(--font-martian-mono)]">
                <span className="text-[var(--color-text-accent)]">Note:</span> You must be included in the final Sunday snapshot to be eligible to claim for the current epoch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasurySection;
