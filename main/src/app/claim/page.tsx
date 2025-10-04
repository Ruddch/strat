"use client";

import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import dynamic from "next/dynamic";
import { OrientationLock } from "@/components/ui/OrientationLock";

const ResponsiveBackgroundEffects = dynamic(() => import("@/components/ui/ResponsiveBackgroundEffects").then(mod => ({ default: mod.ResponsiveBackgroundEffects })), { 
  ssr: false 
});

// Utility function to truncate wallet addresses
const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4) => {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Mock data for payouts
const payouts = [
  {
    id: 1,
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    amount: 1000,
    date: "5.01.2025"
  },
  {
    id: 2,
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    amount: 1000,
    date: "5.01.2025"
  },
  {
    id: 3,
    walletAddress: "0x9876543210fedcba9876543210fedcba98765432",
    amount: 1000,
    date: "5.01.2025"
  },
  {
    id: 4,
    walletAddress: "0xfedcba9876543210fedcba9876543210fedcba98",
    amount: 1000,
    date: "5.01.2025"
  },
  {
    id: 5,
    walletAddress: "0x5555555555555555555555555555555555555555",
    amount: 1000,
    date: "5.01.2025"
  }
];

export default function ClaimPage() {
  const { address } = useAccount();

  return (
    <OrientationLock>
      <div className="ml-0 mr-0 lg:ml-64 lg:mr-64 font-[family-name:var(--font-avenue-mono)] h-screen no-scrollbar overflow-y-scroll snap-y snap-mandatory">
      <div id="claim" className="relative grid grid-rows-[1fr_auto] min-h-screen snap-start">
        <ResponsiveBackgroundEffects message="CLAIM" mobileFontSize={80} desktopFontSize={200} />
        <main className="relative flex flex-col justify-between h-full z-10 text-white">
          {/* Top Section - Metrics */}
          <div className="flex justify-between w-full border-b border-[var(--color-border-accent)]">
            <div className="flex-1 text-center pb-7 pt-13 border-r border-[var(--color-border-accent)]">
              <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
                Total claimed dividends
              </p>
              <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                5 587
              </p>
            </div>
            <div className="flex-1 text-center pb-7 pt-13">
              <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
                This week<br className="lg:hidden" /> dividends
              </p>
              <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                6 847
              </p>
            </div>
          </div>

          {/* Middle Section - Background Effects (already handled by BackgroundEffects component) */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex-1 h-full min-h-[300px] p-2"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
          </div>
          <div className="w-full flex items-center border-t border-b border-[var(--color-border-accent)]">
            {/* Left Text Block - 1/4 width */}
            <div className={`${address ? 'w-1/2' : 'w-1/4'}`}>
              <div className="space-y-2">
                <p className="text-sm p-2 text-white font-[family-name:var(--font-martian-mono)]">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </p>
              </div>
            </div>

            {/* Right Connect Wallet Block - 3/4 width when not connected, 1/2 width when connected */}
            <div className={`${address ? 'w-1/2' : 'w-3/4'} flex justify-center`}>
              <ConnectKitButton.Custom>
                {({ isConnected, isConnecting, show }) => {
                  return (
                    <button 
                      onClick={isConnected ? () => console.log('Claim clicked') : show}
                      className="w-full px-2 py-6 flex items-center justify-center transition-colors hover:opacity-80 cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(96, 255, 255, 0.12)',
                        border: '1px solid rgba(20, 78, 82, 1)'
                      }}
                    >
                      <span className="text-[24px] lg:text-[48px] font-normal leading-[100%] tracking-[0%] text-center font-[family-name:var(--font-random-grotesque)]"
                        style={{ color: 'rgba(0, 255, 251, 1)' }}
                      >
                        {isConnecting ? (
                          <div className="animate-spin w-4 h-4 lg:w-8 lg:h-8 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                          isConnected ? 'CLAIM' : 'CONNECT WALLET'
                        )}
                      </span>
                    </button>
                  );
                }}
              </ConnectKitButton.Custom>
            </div>
          </div>
             <div>
               <h2 className="pt-13 lg:pt-11 pb-11 pl-2 pr-2 border-b border-t border-[var(--color-border-accent)] text-[36px] lg:text-[72px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                 Last Payouts
               </h2>
               
               {/* Last Payouts Table */}
               <div className="flex w-full border-b border-[var(--color-border-accent)]">
                 <div className="flex-1 text-left p-2">
                   <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                     Wallet address
                   </span>
                 </div>
                 <div className="flex-1 p-2">
                   <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                     Amount
                   </span>
                 </div>
                 <div className="flex-1 p-2">
                   <span className="text-[14px] font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]">
                     Date and time
                   </span>
                 </div>
               </div>
                 
                 {/* Table Rows */}
                 {payouts.map((payout, index) => (
                   <div key={payout.id} className={`flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
                     <div className="flex-1 flex items-center text-left p-2 py-5 border-b border-[var(--color-border-accent)]">
                        <span className="text-sm font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]"
                        >
                         {truncateAddress(payout.walletAddress)}
                       </span>
                     </div>
                     <div className="flex-1 border-l p-2 py-5 border-b border-[var(--color-border-accent)]">
                       <div className="flex items-center justify-between gap-2">
                         <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                           {payout.amount}
                         </span>
                           <span className="text-sm font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]"
                           >
                           PENGU
                         </span>
                       </div>
                     </div>
                     <div className="flex-1 flex items-center p-2 py-5 border-l border-b border-[var(--color-border-accent)]">
                       <span className="text-sm font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]"
                         >
                         {payout.date}
                       </span>
                     </div>
                   </div>
                 ))}
             </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex-1 h-full min-h-[100px] p-2"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
            <div className="flex-1 h-full border-l p-2 border-[var(--color-border-accent)]"></div>
          </div>
        </main>
      </div>
    </div>
    </OrientationLock>
  );
}
