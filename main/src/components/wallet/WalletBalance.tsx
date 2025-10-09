"use client";

import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";

export function WalletBalance() {
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading } = useBalance({
    address: address,
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

  const ethBalance = balance ? formatEther(balance.value) : "0";
  const formattedBalance = parseFloat(ethBalance).toFixed(4);

  return (
    <div className="text-[12px] font-light text-white font-[family-name:var(--font-martian-mono)] mb-1">
      {formattedBalance} ETH
    </div>
  );
}
