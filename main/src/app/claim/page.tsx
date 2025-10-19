"use client";

import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import dynamic from "next/dynamic";
import AnimatedValue from "@/components/ui/AnimatedValue";
import SuccessPopup from "@/components/ui/SuccessPopup";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { contractConfig, formatTokenBalance, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { getRecentClaims } from "@/lib/contracts/events";
import React, { useMemo } from "react";

const ResponsiveBackgroundEffects = dynamic(() => import("@/components/ui/ResponsiveBackgroundEffects").then(mod => ({ default: mod.ResponsiveBackgroundEffects })), { 
  ssr: false 
});

// Utility function to truncate wallet addresses
const truncateAddress = (address: string, startChars: number = 6, endChars: number = 4) => {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Interface for claim data from events
interface ClaimData {
  id: number;
  walletAddress: string;
  amount: string;
  date: string;
  epochId: number;
}

// Interface for Merkle tree claim data
interface MerkleClaimData {
  address: string;
  weighted_balance: string;
  claim_amount_wei: string;
  claim_amount_tokens: string;
  proof: string[];
}

// Interface for Merkle tree data
interface MerkleTreeData {
  merkle_root: string;
  total_recipients: number;
  total_claim_amount_wei: string;
  total_claim_amount_tokens: string;
  distribution_amount: string;
  claims: MerkleClaimData[];
}

// Function to fetch Merkle proof from local JSON file
const fetchMerkleProof = async (userAddress: string, epochId: bigint): Promise<{proof: `0x${string}`[], weightedBalance: bigint, claimAmount: bigint} | null> => {
  try {
    // Get fee collector address from contract config
    const treasuryAddress = CONTRACT_ADDRESSES.TREASURY.toLowerCase();
    
    // Form filename: {fee_collector_ca}_{epochId}.json
    const filename = `${treasuryAddress}_${epochId.toString()}.json`;
    
    // Load Merkle tree data from static file
    const response = await fetch(`/static/${filename}`);

    
    if (!response.ok) {
      console.error(`Failed to load merkle tree data: ${response.status}`);
      return null;
    }
    
    const merkleData: MerkleTreeData = await response.json();
    
    // Find user in the merkle tree
    const userClaim = merkleData.claims.find((claim: MerkleClaimData) => 
      claim.address.toLowerCase() === userAddress.toLowerCase()
    );
    
    if (!userClaim) {
      return null;
    }
    
    return {
      proof: userClaim.proof as `0x${string}`[],
      weightedBalance: BigInt(userClaim.weighted_balance),
      claimAmount: BigInt(userClaim.claim_amount_wei)
    };
    
  } catch (error) {
    console.error('Error fetching Merkle proof:', error);
    return null;
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
  const { data: claimableInfo, isLoading: isClaimableInfoLoading } = useReadContract({
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
  const [recentClaims, setRecentClaims] = React.useState<ClaimData[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = React.useState(false);
  
  // Merkle data state
  const [merkleData, setMerkleData] = React.useState<{proof: `0x${string}`[], weightedBalance: bigint, claimAmount: bigint} | null>(null);
  const [isLoadingMerkleData, setIsLoadingMerkleData] = React.useState(false);
  
  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = React.useState(false);
  const [successClaimAmount, setSuccessClaimAmount] = React.useState('0');

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

  // Show success popup when claim is successful

  React.useEffect(() => {
    if (merkleData?.claimAmount && isSuccess) {
      setSuccessClaimAmount(formatTokenBalance(merkleData.claimAmount));
      setShowSuccessPopup(true);
    }
  }, [merkleData?.claimAmount, isSuccess]);
  
  // Load Merkle data when user connects wallet and claimable info is available
  React.useEffect(() => {
    const loadMerkleData = async () => {
      
      // Wait for claimable info to load
      if (!address || isClaimableInfoLoading) {
        return;
      }
      
      // If claimable info is undefined or null, user might not be eligible
      if (claimableInfo === undefined || claimableInfo === null) {
        setMerkleData(null);
        return;
      }
      
      const [, , epochId] = claimableInfo as [boolean, bigint, bigint];
      

      setIsLoadingMerkleData(true);
      try {
        const data = await fetchMerkleProof(address, epochId);
        setMerkleData(data);
      } catch (error) {
        console.error('Error loading Merkle data:', error);
        setMerkleData(null);
      } finally {
        setIsLoadingMerkleData(false);
      }
    };

    loadMerkleData();
  }, [address, claimableInfo, isClaimableInfoLoading]);

  // Function to fetch recent claims from contract events
  const fetchRecentClaims = async () => {
    if (!blockNumber) return;
    
    setIsLoadingClaims(true);
    try {
      // Fetch real events from contract
      const claimEvents = await getRecentClaims(500000); // Last 50000 blocks
      
      // Convert events to display format
      const claims: ClaimData[] = claimEvents.slice(0, 10).map((event, index) => ({
        id: index + 1,
        walletAddress: event.user,
        amount: formatTokenBalance(event.amount),
        date: new Date(event.timestamp * 1000).toLocaleDateString('en-GB'),
        epochId: Number(event.epochId)
      }));
      
      setRecentClaims(claims);
      
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
    if (!claimableInfo || !address) return;
    
    const [, , epochId] = claimableInfo as [boolean, bigint, bigint];

    // Check if Merkle data is already loaded
    if (!merkleData) {
      return;
    }
    
    try {
      // Call the contract with the pre-loaded proof and data from tree
      writeContract({
        ...contractConfig.treasury,
        functionName: 'claimDividends',
        args: [
          epochId,
          merkleData.weightedBalance, // weightedBalance from tree
          merkleData.claimAmount,     // claimAmount from tree
          merkleData.proof            // merkleProof from tree
        ],
      });
    } catch (err) {
      console.error('Claim failed:', err);
      alert('Claim failed. Please try again.');
    }
  };

  const isClamed = useMemo(() => {
    const canClaim = claimableInfo?.[0] === false;
    return isSuccess || (address && merkleData && merkleData.claimAmount > BigInt(0) && canClaim);
  }, [isSuccess, address, merkleData?.claimAmount, claimableInfo]);
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
                  value={merkleData?.claimAmount ? formatTokenBalance(merkleData.claimAmount) : '0'}
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
                 {merkleData?.claimAmount  ? 'You are eligible to claim ' + formatTokenBalance(merkleData.claimAmount) + ' PENGU' 
                 : address ? 'You are not eligible to claim any dividends' : ''} 
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
                      className="w-full px-2 py-6 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(96, 255, 255, 0.12)',
                        border: '1px solid rgba(20, 78, 82, 1)'
                      }}
                      disabled={isConnected && (isClaimableInfoLoading || 
                        isLoadingMerkleData || 
                        isPending || 
                          isConfirming ||
                          isClamed ||
                          !merkleData || 
                          merkleData.claimAmount === BigInt(0))}
                    >
                      <span className="text-[24px] lg:text-[48px] font-normal leading-[100%] tracking-[0%] text-center font-[family-name:var(--font-random-grotesque)]"
                        style={{ color: 'rgba(0, 255, 251, 1)' }}
                      >
                        {isConnecting ? (
                          <div className="animate-spin w-4 h-4 lg:w-8 lg:h-8 border-2 border-current border-t-transparent rounded-full" />
                        ) : isPending || isConfirming || isLoadingMerkleData || isClaimableInfoLoading ? (
                          <div className="animate-spin w-4 h-4 lg:w-8 lg:h-8 border-2 border-current border-t-transparent rounded-full" />
                        ) : isSuccess || isClamed ? (
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
          </div>
        </main>
      </div>
      
      {/* Success Popup */}
      <SuccessPopup
        isVisible={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        claimAmount={successClaimAmount}
      />
    </div>
    </div>
  );
}
