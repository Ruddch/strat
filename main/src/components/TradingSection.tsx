"use client";

import { useState } from "react";
import { WalletBalance } from "@/components/wallet/WalletBalance";
import { BuyInput } from "@/components/wallet/BuyInput";
import { StratTokenBalance } from "@/components/wallet/StratTokenBalance";
import { SellInput } from "@/components/wallet/SellInput";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/config";

export default function TradingSection() {
  const [copied, setCopied] = useState(false);

  const handleBuy = async (amount: string) => {
    try {
      console.log(`Successfully bought tokens for ${amount} ETH`);
    } catch (err) {
      console.error("Failed to buy tokens:", err);
    }
  };

  const handleSell = async (amount: string) => {
    try {
      console.log(`Successfully sold ${amount} tokens`);
    } catch (err) {
      console.error("Failed to sell tokens:", err);
    }
  };

  const copyContractAddress = async () => {
    try {
      //await navigator.clipboard.writeText(CONTRACT_ADDRESSES.STRAT_TOKEN);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  return (
    <div>
      <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
        Trading
      </h2>
      
      <div className="flex flex-row justify-center items-start">
        <div className="w-full p-4 pt-8 pb-8 border-r border-b border-[var(--color-border-accent)] ">
          <div className="">
            
            <h3 className=" mb-4 text-lg font-light text-white font-[family-name:var(--font-martian-mono)]">
              Buy $PST
            </h3>
            <WalletBalance />
            <BuyInput onBuy={handleBuy} />
          </div>
        </div>

        <div className="w-full p-4 pt-8 pb-8 border-b border-[var(--color-border-accent)]">
          <div className="">
            <h3 className="mb-4 text-lg font-light text-white font-[family-name:var(--font-martian-mono)]">
              Sell $PST
            </h3>
            <StratTokenBalance />
            <SellInput onSell={handleSell} />
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-[var(--color-border-accent)]">
        <div className="flex flex-col items-center space-y-2">
          <h4 className="text-[20px] font-light text-white font-[family-name:var(--font-martian-mono)]">
            Contract Address
          </h4>
          <div onClick={copyContractAddress} className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
            <code className="text-[16px] font-mono text-[var(--color-text-accent)] bg-black/20 px-2 py-1 rounded border border-[var(--color-border-accent)]">
              0x************************
            </code>
            {copied && (
              <span className="text-xs text-green-400 font-[family-name:var(--font-martian-mono)]">
                Copied!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}