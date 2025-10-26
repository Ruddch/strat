"use client";

import { useWriteContract, useAccount, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESSES, ROUTER_ABI } from "@/lib/contracts/config";

export function useBuyTokens() {
  const { writeContract, isPending, error } = useWriteContract();
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const buyTokens = async (ethAmount: string, slippageBps: number = 1100) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    if (!publicClient) {
      throw new Error("Public client not available");
    }

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

    const expectedAmount = amountsOut[amountsOut.length - 1];
    const slippageAmount = (expectedAmount * BigInt(slippageBps)) / BigInt(10000);
    const amountOutMin = expectedAmount - slippageAmount;

    const deadline = Math.floor(Date.now() / 1000) + 1200;

    try {
      await writeContract({
        address: CONTRACT_ADDRESSES.ROUTER as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
        args: [amountOutMin, path, address, BigInt(deadline)],
        value: ethAmountWei,
      });
    } catch (err) {
      console.error("Error buying tokens:", err);
      throw err;
    }
  };

  return {
    buyTokens,
    isPending,
    error,
  };
}
