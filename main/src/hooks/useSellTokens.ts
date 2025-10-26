"use client";

import { useWriteContract, useAccount, useReadContract, usePublicClient } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { CONTRACT_ADDRESSES, ROUTER_ABI, STRAT_TOKEN_ABI } from "@/lib/contracts/config";

export function useSellTokens() {
  const { writeContract, isPending, error } = useWriteContract();
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
    abi: STRAT_TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.ROUTER] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const sellTokens = async (tokenAmount: string, slippageBps: number = 1100) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    if (!publicClient) {
      throw new Error("Public client not available");
    }

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

    const expectedAmount = amountsOut[amountsOut.length - 1];
    const slippageMultiplier = BigInt(10000 - slippageBps);
    const amountOutMin = (expectedAmount * slippageMultiplier) / BigInt(10000);

    const deadline = Math.floor(Date.now() / 1000) + 1200;

    try {
      const currentAllowance = allowance || BigInt(0);
      console.log("allowance", allowance);
      
      if (currentAllowance < tokenAmountWei) {
        await writeContract({
          address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
          abi: STRAT_TOKEN_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESSES.ROUTER, maxUint256],
        });
      }

      await writeContract({
        address: CONTRACT_ADDRESSES.ROUTER as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens",
        args: [tokenAmountWei, amountOutMin, path, address, BigInt(deadline)],
      });
    } catch (err) {
      console.error("Error selling tokens:", err);
      throw err;
    }
  };

  return {
    sellTokens,
    isPending,
    error,
    allowance,
  };
}
