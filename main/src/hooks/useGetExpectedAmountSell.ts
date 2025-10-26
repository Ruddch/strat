"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACT_ADDRESSES, ROUTER_ABI } from "@/lib/contracts/config";

export function useGetExpectedAmountSell(tokenAmount: string) {
  const publicClient = usePublicClient();
  const [expectedAmount, setExpectedAmount] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExpectedAmount = async () => {
      if (!tokenAmount || parseFloat(tokenAmount) <= 0 || !publicClient) {
        setExpectedAmount(BigInt(0));
        return;
      }

      setIsLoading(true);
      try {
        const tokenAmountWei = parseUnits(tokenAmount, 18);
        const path = [
          CONTRACT_ADDRESSES.STRAT_TOKEN,
          CONTRACT_ADDRESSES.WETH
        ];

        const amountsOut = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.ROUTER as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [tokenAmountWei, path],
        });

        setExpectedAmount(amountsOut[amountsOut.length - 1]);
      } catch (err) {
        console.error("Error fetching expected amount:", err);
        setExpectedAmount(BigInt(0));
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce запросов
    const timeoutId = setTimeout(fetchExpectedAmount, 300);
    return () => clearTimeout(timeoutId);
  }, [tokenAmount, publicClient]);

  return { expectedAmount, isLoading };
}

