"use client";

import { useState } from "react";
import { useBuyTokens } from "@/hooks/useBuyTokens";
import { useAccount } from "wagmi";
import { useGetExpectedAmount } from "@/hooks/useGetExpectedAmount";
import { formatUnits } from "viem";

interface BuyInputProps {
  onBuy: (amount: string) => void;
}

const ABSTRACT_CHAIN_ID = 2741;

export function BuyInput({ onBuy }: BuyInputProps) {
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("11");
  const { buyTokens, isPending, error } = useBuyTokens();
  const { isConnected, chainId } = useAccount();
  const { expectedAmount, isLoading: isLoadingExpected } = useGetExpectedAmount(amount);
  
  const isWrongNetwork = chainId !== ABSTRACT_CHAIN_ID;

  const handleBuy = async () => {
    if (amount && parseFloat(amount) > 0) {
      try {
        const slippageBps = parseFloat(slippage) * 100;
        await buyTokens(amount, slippageBps);
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
      
        <div className="mt-2 space-y-1">
          <div className="text-[12px] text-white/60 font-[family-name:var(--font-martian-mono)]">
            {isLoadingExpected ? (
              <span>Calculating...</span>
            ) : (
              <>
                {(() => {
                  const feeMultiplier = BigInt(9000);
                  const actualAmount = (expectedAmount * feeMultiplier) / BigInt(10000);
                  
                  const slippageDecimal = parseFloat(slippage) / 100;
                  const slippageMultiplier = BigInt(Math.floor((1 - slippageDecimal) * 10000));
                  const minAmount = (expectedAmount * slippageMultiplier) / BigInt(10000);
                  
                  return (
                    <>
                      <div className="text-white/80">
                        Expected: {parseFloat(formatUnits(actualAmount, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 })} PST
                      </div>
                      <div className="text-white/40">
                        Minimum: {parseFloat(formatUnits(minAmount, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 })} PST
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-white/60 font-[family-name:var(--font-martian-mono)]">
            Slippage (min 11%)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="11"
              max="50"
              step="0.1"
              value={slippage}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseFloat(value) >= 11 && parseFloat(value) <= 50)) {
                  setSlippage(value);
                }
              }}
              className="w-16 px-2 py-1 text-[10px] font-light bg-transparent border border-[var(--color-border-accent)] rounded text-white text-center font-[family-name:var(--font-martian-mono)] focus:outline-none focus:border-[var(--color-text-accent)]"
            />
            <span className="text-[10px] text-white/60">%</span>
          </div>
        </div>
        <input
          type="range"
          min="11"
          max="50"
          step="0.1"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          className="w-full h-1 bg-[var(--color-border-accent)] rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, rgba(0, 255, 251, 1) 0%, rgba(0, 255, 251, 1) ${((parseFloat(slippage) - 11) / 39) * 100}%, var(--color-border-accent) ${((parseFloat(slippage || '11') - 11) / 39) * 100}%, var(--color-border-accent) 100%)`
          }}
        />
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
      {isWrongNetwork && isConnected && (
        <div className="text-orange-400 text-[10px] mt-1 font-[family-name:var(--font-martian-mono)]">
          ⚠️ Please switch to Abstract network
        </div>
      )}
    </div>
  );
}
