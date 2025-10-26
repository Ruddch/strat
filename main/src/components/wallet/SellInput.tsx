"use client";

import { useState } from "react";
import { useSellTokens } from "@/hooks/useSellTokens";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACT_ADDRESSES, STRAT_TOKEN_ABI } from "@/lib/contracts/config";
import { useGetExpectedAmountSell } from "@/hooks/useGetExpectedAmountSell";

interface SellInputProps {
  onSell: (amount: string) => void;
}

const ABSTRACT_CHAIN_ID = 2741;

export function SellInput({ onSell }: SellInputProps) {
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("11");
  const { sellTokens, isPending, error, allowance } = useSellTokens();
  const { address, isConnected, chainId } = useAccount();
  const { expectedAmount, isLoading: isLoadingExpected } = useGetExpectedAmountSell(amount);
  
  const isWrongNetwork = chainId !== ABSTRACT_CHAIN_ID;

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

    if (amount && parseFloat(amount) > 0) {
      try {
        const slippageBps = parseFloat(slippage) * 100;
        await sellTokens(amount, slippageBps);
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

      {/* Ожидаемое количество ETH */}
        <div className="mt-2 space-y-1">
          <div className="text-[12px] text-white/60 font-[family-name:var(--font-martian-mono)]">
            {isLoadingExpected ? (
              <span>Calculating...</span>
            ) : (
              <>
                {(() => {
                  // Expected = с учетом 10% комиссии (90% токенов попадают на обмен)
                  const feeMultiplier = BigInt(9000);
                  const actualAmount = (expectedAmount * feeMultiplier) / BigInt(10000);
                  
                  // Minimum = expectedAmount * (1 - slippage%)
                  const slippageDecimal = parseFloat(slippage) / 100;
                  const slippageMultiplier = BigInt(Math.floor((1 - slippageDecimal) * 10000));
                  const minAmount = (expectedAmount * slippageMultiplier) / BigInt(10000);
                  
                  return (
                    <>
                      <div className="text-white/80">
                        Expected: {parseFloat(formatUnits(actualAmount, 18)).toFixed(4)} ETH
                      </div>
                      <div className="text-white/40">
                        Minimum: {parseFloat(formatUnits(minAmount, 18)).toFixed(4)} ETH
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
