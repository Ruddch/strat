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
        const response = await fetch('https://backend.portal.abs.xyz/api/oracle/token/prices?contract=0x0000000000000000000000000000000000000000&period=all', {
          credentials: 'omit'
        });
        const data = await response.json();
        
        // Получаем последнюю цену из массива 1h
        const hourlyPrices = data.prices['0x0000000000000000000000000000000000000000']['1h'].prices;
        if (hourlyPrices && hourlyPrices.length > 0) {
          // Берем последний элемент массива (самая свежая цена)
          const latestPrice = hourlyPrices[hourlyPrices.length - 1];
          setEthPrice(latestPrice.priceUSD);
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
    const interval = setInterval(fetchEthPrice, 30000);
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
        return {
          id: Number(id),
          ...lot
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
    return [];
    // return processLots
    //   .sort((a, b) => {
    //     if (a.avgPriceWeiPerPengu < b.avgPriceWeiPerPengu) return -1;
    //     if (a.avgPriceWeiPerPengu > b.avgPriceWeiPerPengu) return 1;
    //     return 0;
    //   })
    //   .slice(0, 4);
  }, [processLots]);

  // Get 4 latest lots (sorted by timestamp descending)
  const lastBuys = useMemo((): LotWithId[] => {
    return [];
    // return processLots
    //   .sort((a, b) => {
    //     if (a.timestamp > b.timestamp) return -1;
    //     if (a.timestamp < b.timestamp) return 1;
    //     return 0;
    //   })
    //   .slice(0, 4);
  }, [processLots]);

  return {
    closestLots,
    lastBuys,
    hasInitiallyLoaded,
    ethPrice,
    isEthPriceLoading,
  };
};
