"use client";

import Image from "next/image";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";

const BackgroundEffects = dynamic(() => import("@/components/ui/BackgroundEffects").then(mod => ({ default: mod.BackgroundEffects })), { 
  ssr: false 
});

export default function ClaimPage() {
  const { address } = useAccount();

  return (
    <div className="relative grid grid-rows-[1fr_auto] min-h-screen ml-64 mr-64 p-8 pb-20 sm:p-20 font-[family-name:var(--font-avenue-mono)] bg-black overflow-hidden">
      <BackgroundEffects />

      <main className="relative flex flex-col items-center justify-center z-10 text-white text-center">
        <div className="flex flex-col items-center gap-8">
          <Image
            src="/abstract.svg"
            alt="Abstract logo"
            width={240}
            height={32}
            quality={100}
            priority
          />
          
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 font-[family-name:var(--font-roobert)]">
              Claim Your Rewards
            </h1>
            <p className="text-lg text-gray-300 mb-8 font-[family-name:var(--font-roobert)]">
              Get your rewards for participating in the ecosystem
            </p>
          </div>

          {address ? (
            <div className="w-full max-w-md">
              <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-xl font-semibold mb-4 font-[family-name:var(--font-roobert)]">
                  Available Rewards
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                    <span className="font-[family-name:var(--font-roobert)]">Staking Rewards</span>
                    <span className="text-green-400 font-bold">0.5 ETH</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                    <span className="font-[family-name:var(--font-roobert)]">Liquidity Rewards</span>
                    <span className="text-green-400 font-bold">1.2 ETH</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded">
                    <span className="font-[family-name:var(--font-roobert)]">Governance Rewards</span>
                    <span className="text-green-400 font-bold">0.8 ETH</span>
                  </div>
                </div>
                <button className="w-full mt-6 bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-[family-name:var(--font-roobert)]">
                  Claim All Rewards
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-300 mb-6 font-[family-name:var(--font-roobert)]">
                Connect your wallet to see available rewards
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
