import { formatUnits, parseUnits } from 'viem';
import { TREASURY_ABI, ERC20_ABI } from './treasury-abi';
import { BUYBACK_MANAGER_ABI } from './buyback-manager-abi';
import { FEE_COLLECTOR_ABI } from './fee-collector-abi';
import { STRATEGY_CORE_ABI } from './strategy-core-abi';
import { STRAT_TOKEN_ABI } from './strat-token-abi';
import { CONTRACT_ADDRESSES } from './config';

export function formatTokenBalance(balance: bigint, decimals: number = 18): string {
  const formatted = formatUnits(balance, decimals);

  if (parseFloat(formatted) >= 0.01) {
    return parseFloat(formatted).toFixed(2);
  }
  
  const decimalIndex = formatted.indexOf('.');
  if (decimalIndex === -1) {
    return formatted;
  }
  
  const afterDecimal = formatted.substring(decimalIndex + 1);
  const firstNonZeroIndex = afterDecimal.search(/[1-9]/);
  
  if (firstNonZeroIndex === -1) {
    return "0.0000";
  }
  
  const zeroCount = firstNonZeroIndex;
  
  const significantDigits = afterDecimal.substring(firstNonZeroIndex, firstNonZeroIndex + 2);
  
  return `0.0${getSubscript(zeroCount)}${significantDigits}`;
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}

export function formatTokenPrice(price: bigint, decimals: number = 18): string {
  const priceStr = formatUnits(price, decimals);
  
  if (parseFloat(priceStr) >= 0.0001) {
    return parseFloat(priceStr).toFixed(4);
  }
  
  const decimalIndex = priceStr.indexOf('.');
  if (decimalIndex === -1) {
    return priceStr;
  }
  
  const afterDecimal = priceStr.substring(decimalIndex + 1);
  const firstNonZeroIndex = afterDecimal.search(/[1-9]/);
  
  if (firstNonZeroIndex === -1) {
    return "0.0000";
  }
  
  const zeroCount = firstNonZeroIndex;
  
  const significantDigits = afterDecimal.substring(firstNonZeroIndex, firstNonZeroIndex + 4);
  
  return `0.0${getSubscript(zeroCount)}${significantDigits}`;
}

function getSubscript(num: number): string {
  const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return num.toString().split('').map(digit => subscripts[parseInt(digit)]).join('');
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export const contractConfig = {
  treasury: {
    address: CONTRACT_ADDRESSES.TREASURY as `0x${string}`,
    abi: TREASURY_ABI,
  },
  penguToken: {
    address: CONTRACT_ADDRESSES.PENGU_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
  },
  buybackManager: {
    address: CONTRACT_ADDRESSES.BUYBACK_MANAGER as `0x${string}`,
    abi: BUYBACK_MANAGER_ABI,
  },
  feeCollector: {
    address: CONTRACT_ADDRESSES.FEE_COLLECTOR as `0x${string}`,
    abi: FEE_COLLECTOR_ABI,
  },
  strategyCore: {
    address: CONTRACT_ADDRESSES.STRATEGY_CORE as `0x${string}`,
    abi: STRATEGY_CORE_ABI,
  },
  stratToken: {
    address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
    abi: STRAT_TOKEN_ABI,
  },
} as const;

export const EPOCH_CONSTANTS = {
  DURATION_DAYS: 7,
  DURATION_SECONDS: 7 * 24 * 60 * 60,
  CLAIMABLE_EPOCHS: 1,
  EXPIRED_EPOCHS: 3,
} as const;
