"use client";

import { useWriteContract, useAccount } from "wagmi";
import { parseEther } from "viem";
import { CONTRACT_ADDRESSES, ROUTER_ABI } from "@/lib/contracts/config";

export function useBuyTokens() {
  const { writeContract, isPending, error } = useWriteContract();
  const { address } = useAccount();

  const buyTokens = async (ethAmount: string) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const ethAmountWei = parseEther(ethAmount);
    
    const path = [
        CONTRACT_ADDRESSES.WETH,
        CONTRACT_ADDRESSES.STRAT_TOKEN
    ];

    const amountOutMin = BigInt(0); 

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
