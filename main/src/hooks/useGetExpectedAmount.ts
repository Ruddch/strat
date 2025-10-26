"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESSES, ROUTER_ABI } from "@/lib/contracts/config";

export function useGetExpectedAmount(ethAmount: string) {
  const publicClient = usePublicClient();
  const [expectedAmount, setExpectedAmount] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExpectedAmount = async () => {
      if (!ethAmount || parseFloat(ethAmount) <= 0 || !publicClient) {
        setExpectedAmount(BigInt(0));
        return;
      }

      setIsLoading(true);
      try {
        const ethAmountWei = parseEther(ethAmount);
        const path = [
          CONTRACT_ADDRESSES.WETH,
          CONTRACT_ADDRESSES.STRAT_TOKEN
        ];

        const amountsOut = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.ROUTER as `0x${string}`,
          abi: ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [ethAmountWei, path],
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
  }, [ethAmount, publicClient]);

  return { expectedAmount, isLoading };
}

