import { getPublicClient } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { CONTRACT_ADDRESSES } from './config';

// Interface for claim event data
export interface ClaimEventData {
  epochId: bigint;
  user: string;
  amount: bigint;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: number;
}

// Function to fetch recent claim events from Treasury contract
export async function fetchRecentClaimEvents(fromBlock?: bigint, toBlock?: bigint): Promise<ClaimEventData[]> {
  try {
    const publicClient = getPublicClient(config);
    
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    // Get logs for DividendsClaimed events
    const logs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.TREASURY as `0x${string}`,
      event: {
        type: 'event',
        name: 'DividendsClaimed',
        inputs: [
          { indexed: true, name: 'epochId', type: 'uint256' },
          { indexed: true, name: 'user', type: 'address' },
          { indexed: false, name: 'amount', type: 'uint256' }
        ]
      },
      fromBlock: fromBlock || 'earliest',
      toBlock: toBlock || 'latest'
    });

    // Transform logs to our interface
    const claimEvents: ClaimEventData[] = await Promise.all(
      logs.map(async (log) => {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        
        return {
          epochId: log.args?.epochId || BigInt(0),
          user: log.args?.user || '',
          amount: log.args?.amount || BigInt(0),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: Number(block.timestamp)
        };
      })
    );

    // Sort by timestamp (newest first)
    claimEvents.sort((a, b) => b.timestamp - a.timestamp);

    return claimEvents;
  } catch (error) {
    console.error('Error fetching claim events:', error);
    return [];
  }
}

// Function to get recent claims (last 1000 blocks or specified range)
export async function getRecentClaims(blockRange?: number): Promise<ClaimEventData[]> {
  try {
    const publicClient = getPublicClient(config);
    
    if (!publicClient) {
      throw new Error('Public client not available');
    }

    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - BigInt(blockRange || 1000);
    
    return await fetchRecentClaimEvents(fromBlock, currentBlock);
  } catch (error) {
    console.error('Error getting recent claims:', error);
    return [];
  }
}
