import { useMemo, useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { contractConfig } from '@/lib/contracts';

// Types for lot data
export interface Lot {
  amountPengu: bigint;
  ethSpent: bigint;
  avgPriceWeiPerPengu: bigint;
  timestamp: bigint;
  active: boolean;
}

export interface LotWithId extends Lot {
  id: number;
}

export const useLots = () => {
  // Get all active lots from StrategyCore
  const { data: allLots, isLoading: isLotsLoading } = useReadContract({
    ...contractConfig.strategyCore,
    functionName: 'getAllActiveLots',
    query: {
      refetchInterval: 30000, // 30 seconds
    },
  });

  // Get current ETH price
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [isEthPriceLoading, setIsEthPriceLoading] = useState(true);

  // Track initial loading states
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        setIsEthPriceLoading(true);
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bestPair = data.pairs.reduce((prev: any, current: any) => 
            parseFloat(prev.liquidity?.usd || '0') > parseFloat(current.liquidity?.usd || '0') ? prev : current
          );
          setEthPrice(parseFloat(bestPair.priceUsd || '0'));
        } else {
          setEthPrice(0);
        }
      } catch (error) {
        console.error('Error fetching ETH price:', error);
        setEthPrice(0);
      } finally {
        setIsEthPriceLoading(false);
      }
    };

    fetchEthPrice();
    // Update price every 30 seconds
    const interval = setInterval(fetchEthPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Track when data has initially loaded
  useEffect(() => {
    if (!isLotsLoading && allLots !== undefined) {
      setHasInitiallyLoaded(true);
    }
  }, [isLotsLoading, allLots]);

  // Process lots data
  const processLots = useMemo((): LotWithId[] => {
    if (!allLots || isLotsLoading) return [];
    
    try {
      const [lotIds, lots] = allLots as [bigint[], Lot[]];
      
      // Create array with lot data
      const lotsWithIds: LotWithId[] = lotIds.map((id, index) => {
        const lot = lots[index];
        const lotId = Number(id);
        
        // Apply price adjustment for lots with ID 0-10
        let adjustedAvgPrice = lot.avgPriceWeiPerPengu;
        if (lotId >= 0 && lotId <= 10) {
          adjustedAvgPrice = BigInt(Math.floor(Number(lot.avgPriceWeiPerPengu) * 0.8687));
        }
        
        return {
          id: lotId,
          ...lot,
          avgPriceWeiPerPengu: adjustedAvgPrice
        };
      });
      
      return lotsWithIds;
    } catch (error) {
      console.error('Error processing lots:', error);
      return [];
    }
  }, [allLots, isLotsLoading]);

  // Get 4 lots closest to sale (lowest avgPriceWeiPerPengu)
  const closestLots = useMemo((): LotWithId[] => {
    return processLots
      .sort((a, b) => {
        if (a.avgPriceWeiPerPengu < b.avgPriceWeiPerPengu) return -1;
        if (a.avgPriceWeiPerPengu > b.avgPriceWeiPerPengu) return 1;
        return 0;
      })
      .slice(0, 4);
  }, [processLots]);

  // Get 4 latest lots (sorted by timestamp descending)
  const lastBuys = useMemo((): LotWithId[] => {
    return processLots
      .sort((a, b) => {
        if (a.timestamp > b.timestamp) return -1;
        if (a.timestamp < b.timestamp) return 1;
        return 0;
      })
      //.slice(0, 4);
  }, [processLots]);

  return {
    closestLots,
    lastBuys,
    hasInitiallyLoaded,
    ethPrice,
    isEthPriceLoading,
  };
};
