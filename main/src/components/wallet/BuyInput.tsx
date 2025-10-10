"use client";

import { useState } from "react";
import { useBuyTokens } from "@/hooks/useBuyTokens";
import { useAccount } from "wagmi";

interface BuyInputProps {
  onBuy: (amount: string) => void;
}

export function BuyInput({ onBuy }: BuyInputProps) {
  const [amount, setAmount] = useState("");
  const { buyTokens, isPending, error } = useBuyTokens();
  const { isConnected } = useAccount();

  const handleBuy = async () => {
    const tradingEnabled = localStorage.getItem('TRAIDING_ENABLED') === 'true';
    if (amount && parseFloat(amount) > 0) {
      try {
        if (tradingEnabled) {
          await buyTokens(amount);
        } else {
          console.log("Trading is not enabled");
        }
        onBuy(amount);
        setAmount("");
      } catch (err) {
        console.error("Failed to buy tokens:", err);
      }
    }
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col justify-start">
        <div className="space-y-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full px-3 py-2 text-[12px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white placeholder-white/40 font-[family-name:var(--font-martian-mono)] focus:outline-none focus:border-[var(--color-text-accent)]"
            min="0"
            step="0.001"
            disabled={isPending || !isConnected}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setAmount("1")}
              className="px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white hover:opacity-80 transition-opacity font-[family-name:var(--font-martian-mono)] disabled:opacity-50 cursor-pointer"
              disabled={isPending || !isConnected}
            >
              1 ETH
            </button>
            <button
              onClick={() => setAmount("0.1")}
              className="px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white hover:opacity-80 transition-opacity font-[family-name:var(--font-martian-mono)] disabled:opacity-50 cursor-pointer"
              disabled={isPending || !isConnected}
            >
              0.1 ETH
            </button>
            <button
              onClick={() => setAmount("0.01")}
              className="px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white hover:opacity-80 transition-opacity font-[family-name:var(--font-martian-mono)] disabled:opacity-50 cursor-pointer"
              disabled={isPending || !isConnected}
            >
              0.01 ETH
            </button>
          </div>
        </div>
      </div>
      <button 
        onClick={handleBuy}
        className="block w-full py-4 px-2 flex items-center justify-center gap-2.5 transition-colors hover:opacity-80 cursor-pointer font-[family-name:var(--font-martian-mono)] text-sm font-light leading-[150%] tracking-[0%] text-center disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        style={{
          backgroundColor: 'rgba(0, 255, 251, 1)',
          color: 'rgba(1, 27, 35, 1)'
        }}
        disabled={isPending || !amount || parseFloat(amount) <= 0 || !isConnected}
      >
        {isPending ? "Buying..." : "Buy"}
      </button>
      {error && (
        <div className="text-red-500 text-[10px] mt-1 font-[family-name:var(--font-martian-mono)]">
          Error
        </div>
      )}
    </div>
  );
}
