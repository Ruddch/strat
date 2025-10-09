"use client";

import { WalletBalance } from "@/components/wallet/WalletBalance";
import { BuyInput } from "@/components/wallet/BuyInput";
import { StratTokenBalance } from "@/components/wallet/StratTokenBalance";
import { SellInput } from "@/components/wallet/SellInput";

export default function TradingSection() {
  // Функция обработки покупки
  const handleBuy = async (amount: string) => {
    try {
      console.log(`Successfully bought tokens for ${amount} ETH`);
    } catch (err) {
      console.error("Failed to buy tokens:", err);
    }
  };

  // Функция обработки продажи
  const handleSell = async (amount: string) => {
    try {
      console.log(`Successfully sold ${amount} tokens`);
    } catch (err) {
      console.error("Failed to sell tokens:", err);
    }
  };

  return (
    <div>
      <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
        Trading
      </h2>
      
      <div className="flex flex-row justify-center items-start">
        {/* Левая колонка - Покупка */}
        <div className="w-full max-w-md p-4 pt-8 pb-8 border-r border-b border-[var(--color-border-accent)] ">
          {/* Секция покупки */}
          <div className="">
            
            <h3 className=" mb-4 text-lg font-light text-white font-[family-name:var(--font-martian-mono)]">
              Buy $PST
            </h3>
            <WalletBalance />
            <BuyInput onBuy={handleBuy} />
          </div>
        </div>

        {/* Правая колонка - Продажа */}
        <div className="w-full max-w-md p-4 pt-8 pb-8 border-b border-[var(--color-border-accent)]">
          {/* Секция продажи */}
          <div className="">
            <h3 className="mb-4 text-lg font-light text-white font-[family-name:var(--font-martian-mono)]">
              Sell $PST
            </h3>
            <StratTokenBalance />
            <SellInput onSell={handleSell} />
          </div>
        </div>
      </div>
    </div>
  );
}