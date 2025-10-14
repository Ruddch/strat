"use client";

import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import dynamic from "next/dynamic";
import AnimatedValue from "@/components/ui/AnimatedValue";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { contractConfig, formatTokenBalance } from "@/lib/contracts";
import { getRecentClaims } from "@/lib/contracts/events";
import React from "react";

const ResponsiveBackgroundEffects = dynamic(() => import("@/components/ui/ResponsiveBackgroundEffects").then(mod => ({ default: mod.ResponsiveBackgroundEffects })), { 
  ssr: false 
});

// Utility function to truncate wallet addresses
const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4) => {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Interface for claim data
interface ClaimData {
  id: number;
  walletAddress: string;
  amount: string;
  date: string;
  epochId: number;
}

// Function to generate fake Merkle proof
const generateFakeMerkleProof = (userAddress: string, weightedBalance: bigint, claimAmount: bigint): `0x${string}`[] => {
  // Generate fake proof hashes (in real implementation, these would come from Merkle tree)
  const fakeProof: `0x${string}`[] = [
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
  ];
  
  console.log(`Generated fake Merkle proof for user ${userAddress}, weightedBalance: ${weightedBalance}, claimAmount: ${claimAmount}`);
  return fakeProof;
};

// Function to fetch Merkle proof from fake backend
const fetchMerkleProof = async (userAddress: string, epochId: bigint, weightedBalance: bigint, claimAmount: bigint): Promise<`0x${string}`[]> => {
  try {
    // Call the API endpoint
    const response = await fetch(`/api/merkle-proof?user=${userAddress}&epoch=${epochId}&weightedBalance=${weightedBalance}&claimAmount=${claimAmount}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate Merkle proof');
    }
    
    console.log('API response:', data);
    return data.proof;
    
  } catch (error) {
    console.error('Error fetching Merkle proof from API:', error);
    // Fallback to local fake proof generation
    console.log('Falling back to local fake proof generation');
    return generateFakeMerkleProof(userAddress, weightedBalance, claimAmount);
  }
};


export default function ClaimPage() {
  const { address } = useAccount();
  const { data: blockNumber } = useBlockNumber();

  // Get user's total claimed dividends
  const { data: userClaimedDividends, isLoading: isClaimedLoading } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getUserTotalClaimedDividends',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 30000, // 30 seconds
      enabled: !!address, // Only fetch if wallet is connected
    },
  });

  // Get user's current epoch dividends
  const { data: userCurrentEpochDividends, isLoading: isCurrentEpochLoading } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getUserCurrentEpochDividends',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 30000, // 30 seconds
      enabled: !!address, // Only fetch if wallet is connected
    },
  });

  // Get user's claimable info
  const { data: claimableInfo } = useReadContract({
    ...contractConfig.treasury,
    functionName: 'getUserClaimableInfo',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 30000, // 30 seconds
      enabled: !!address, // Only fetch if wallet is connected
    },
  });

  // Write contract for claiming
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Track initial loading state
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);
  const [hasCurrentEpochLoaded, setHasCurrentEpochLoaded] = React.useState(false);
  const [isFetchingProof, setIsFetchingProof] = React.useState(false);
  const [recentClaims, setRecentClaims] = React.useState<ClaimData[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = React.useState(false);

  React.useEffect(() => {
    if (!isClaimedLoading && userClaimedDividends !== undefined) {
      setHasInitiallyLoaded(true);
    }
  }, [isClaimedLoading, userClaimedDividends]);

  React.useEffect(() => {
    if (!isCurrentEpochLoading && userCurrentEpochDividends !== undefined) {
      setHasCurrentEpochLoaded(true);
    }
  }, [isCurrentEpochLoading, userCurrentEpochDividends]);

  // Function to fetch recent claims from contract events
  const fetchRecentClaims = async () => {
    if (!blockNumber) return;
    
    setIsLoadingClaims(true);
    try {
      // Fetch real events from contract
      const claimEvents = await getRecentClaims(1000); // Last 1000 blocks
      
      // Convert events to display format
      const claims: ClaimData[] = claimEvents.slice(0, 10).map((event, index) => ({
        id: index + 1,
        walletAddress: event.user,
        amount: formatTokenBalance(event.amount),
        date: new Date(event.timestamp * 1000).toLocaleDateString('en-GB'),
        epochId: Number(event.epochId)
      }));
      
      setRecentClaims(claims);
      console.log('Fetched real claim events:', claims);
      
    } catch (error) {
      console.error('Error fetching recent claims:', error);
      // Set empty array on error
      setRecentClaims([]);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  // Fetch recent claims when block number changes
  React.useEffect(() => {
    if (blockNumber) {
      fetchRecentClaims();
    }
  }, [blockNumber]);

  // Handle claim function
  const handleClaim = async () => {
    console.log(claimableInfo, address);
    if (!claimableInfo || !address) return;
    
    const [canClaim, claimableAmount, epochId] = claimableInfo as [boolean, bigint, bigint];
    
    if (!canClaim || claimableAmount === BigInt(0)) {
      alert('No dividends available to claim');
      return;
    }

    try {
      setIsFetchingProof(true);
      
      // Fetch Merkle proof from fake backend
      const merkleProof = await fetchMerkleProof(
        address,
        epochId,
        claimableAmount, // weightedBalance
        claimableAmount  // claimAmount
      );
      
      console.log('Fetched Merkle proof:', merkleProof);
      
      // Now call the contract with the proof
      writeContract({
        ...contractConfig.treasury,
        functionName: 'claimDividends',
        args: [
          epochId,
          claimableAmount, // weightedBalance
          claimableAmount, // claimAmount
          merkleProof as `0x${string}`[] // merkleProof from backend
        ],
      });
    } catch (err) {
      console.error('Claim failed:', err);
      alert('Claim failed. Please try again.');
    } finally {
      setIsFetchingProof(false);
    }
  };

  return (
    <div>
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
                <AnimatedValue
                  isLoading={!address || !hasInitiallyLoaded}
                  value={userClaimedDividends ? formatTokenBalance(userClaimedDividends) : '0'}
                />
              </p>
            </div>
            <div className="flex-1 text-center pb-7 pt-13">
              <p className="text-sm text-gray-300 mb-2 font-[family-name:var(--font-martian-mono)]">
                This week<br className="lg:hidden" /> dividends
              </p>
              <p className="text-[60px] lg:text-[124px] font-normal leading-[100%] tracking-[0%] text-center text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                <AnimatedValue
                  isLoading={!address || !hasCurrentEpochLoaded}
                  value={userCurrentEpochDividends ? formatTokenBalance(userCurrentEpochDividends) : '0'}
                />
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
                  
                </p>
              </div>
            </div>

            {/* Right Connect Wallet Block - 3/4 width when not connected, 1/2 width when connected */}
            <div className={`${address ? 'w-1/2' : 'w-3/4'} flex justify-center`}>
              <ConnectKitButton.Custom>
                {({ isConnected, isConnecting, show }) => {
                  return (
                    <button 
                      onClick={isConnected ? handleClaim : show}
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
                        ) : isFetchingProof ? (
                          'FETCHING PROOF...'
                        ) : isPending || isConfirming ? (
                          <div className="animate-spin w-4 h-4 lg:w-8 lg:h-8 border-2 border-current border-t-transparent rounded-full" />
                        ) : isSuccess ? (
                          'CLAIMED!'
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
                 {isLoadingClaims ? (
                   <div className="flex w-full justify-center p-8 border-b border-[var(--color-border-accent)]">
                     <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
                   </div>
                 ) : recentClaims.length > 0 ? (
                   recentClaims.map((claim, index) => (
                     <div key={claim.id} className={`flex w-full ${index % 2 === 1 ? 'bg-[rgba(96,255,255,0.05)]' : ''}`}>
                       <div className="flex-1 flex items-center text-left p-2 py-5 border-b border-[var(--color-border-accent)]">
                          <span className="text-sm font-light leading-[150%] tracking-[0%] text-white font-[family-name:var(--font-martian-mono)]"
                          >
                           {truncateAddress(claim.walletAddress)}
                         </span>
                       </div>
                       <div className="flex-1 border-l p-2 py-5 border-b border-[var(--color-border-accent)]">
                         <div className="flex items-center justify-between gap-2">
                           <span className="text-[20px] lg:text-[40px] font-normal leading-[100%] tracking-[0%] text-[var(--color-text-accent)] font-[family-name:var(--font-random-grotesque)]">
                             {claim.amount}
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
                           {claim.date}
                         </span>
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="flex w-full justify-center p-8 border-b border-[var(--color-border-accent)]">
                     <span className="text-sm text-gray-400 font-[family-name:var(--font-martian-mono)]">
                       No recent claims found
                     </span>
                   </div>
                 )}
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
    </div>
  );
}
