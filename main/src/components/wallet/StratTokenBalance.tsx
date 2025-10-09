"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { CONTRACT_ADDRESSES, STRAT_TOKEN_ABI } from "@/lib/contracts/config";

export function StratTokenBalance() {
  const { address, isConnected } = useAccount();
  
  const { data: balance, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
    abi: STRAT_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="text-[12px] font-light text-white font-[family-name:var(--font-martian-mono)] mb-1">
        Loading...
      </div>
    );
  }

  const tokenBalance = balance ? formatUnits(balance, 18) : "0";
  const formattedBalance = parseFloat(tokenBalance).toFixed(2);

  return (
    <div className="text-[12px] font-light text-white font-[family-name:var(--font-martian-mono)] mb-1">
      {formattedBalance} PST
    </div>
  );
}
