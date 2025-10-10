"use client";

import { useState } from "react";
import { useSellTokens } from "@/hooks/useSellTokens";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACT_ADDRESSES, STRAT_TOKEN_ABI } from "@/lib/contracts/config";

interface SellInputProps {
  onSell: (amount: string) => void;
}

export function SellInput({ onSell }: SellInputProps) {
  const [amount, setAmount] = useState("");
  const { sellTokens, isPending, error, allowance } = useSellTokens();
  const { address, isConnected } = useAccount();

  // Получаем баланс STRAT токенов
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
    abi: STRAT_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const handleSell = async () => {
    const tradingEnabled = localStorage.getItem('TRAIDING_ENABLED') === 'true';

    if (amount && parseFloat(amount) > 0) {
      try {
        if (tradingEnabled) {
          await sellTokens(amount);
        } else {
          console.log("Trading is not enabled");
        }
        onSell(amount);
        setAmount("");
      } catch (err) {
        console.error("Failed to sell tokens:", err);
      }
    }
  };

  const setPercentage = (percentage: number) => {
    if (balance) {
      const tokenBalance = formatUnits(balance, 18);
      const percentageAmount = (parseFloat(tokenBalance) * percentage / 100).toString();
      setAmount(percentageAmount);
    }
  };

  // Проверяем статус approve
  const needsApprove = allowance && amount ? 
    allowance < parseUnits(amount, 18) : false;

  return (
    <div className="mb-4">
      <div className="flex flex-col justify-end">
        <div className="space-y-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full px-3 py-2 text-[12px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white placeholder-white/40 font-[family-name:var(--font-martian-mono)] focus:outline-none focus:border-[var(--color-text-accent)]"
            min="0"
            step="0.01"
            disabled={isPending || !isConnected}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setPercentage(25)}
              className="px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white hover:opacity-80 transition-opacity font-[family-name:var(--font-martian-mono)] disabled:opacity-50 cursor-pointer"
              disabled={isPending || !balance || !isConnected}
            >
              25%
            </button>
            <button
              onClick={() => setPercentage(50)}
              className="px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white hover:opacity-80 transition-opacity font-[family-name:var(--font-martian-mono)] disabled:opacity-50 cursor-pointer"
              disabled={isPending || !balance || !isConnected}
            >
              50%
            </button>
            <button
              onClick={() => setPercentage(100)}
              className="px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white hover:opacity-80 transition-opacity font-[family-name:var(--font-martian-mono)] disabled:opacity-50 cursor-pointer"
              disabled={isPending || !balance || !isConnected}
            >
              100%
            </button>
          </div>
        </div>
      </div>
      <button 
        onClick={handleSell}
        className="block w-full py-4 px-2 flex items-center justify-center gap-2.5 transition-colors hover:opacity-80 cursor-pointer font-[family-name:var(--font-martian-mono)] text-sm font-light leading-[150%] tracking-[0%] text-center disabled:opacity-50 disabled:cursor-not-allowed mt-7 md:mt-4"
        style={{
          backgroundColor: 'rgba(0, 255, 251, 1)',
          color: 'rgba(1, 27, 35, 1)'
        }}
        disabled={isPending || !amount || parseFloat(amount) <= 0 || !isConnected}
      >
        {isPending ? "Processing..." : needsApprove ? "Approve & Sell" : "Sell"}
      </button>
      {error && (
        <div className="text-red-500 text-[10px] mt-1 font-[family-name:var(--font-martian-mono)]">
          Error: {error.message}
        </div>
      )}
    </div>
  );
}
