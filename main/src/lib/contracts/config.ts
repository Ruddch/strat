import { TREASURY_ABI, ERC20_ABI } from './treasury-abi';
import { BUYBACK_MANAGER_ABI } from './buyback-manager-abi';
import { FEE_COLLECTOR_ABI } from './fee-collector-abi';
import { STRATEGY_CORE_ABI } from './strategy-core-abi';
import { STRAT_TOKEN_ABI } from './strat-token-abi';
import { ROUTER_ABI } from './router-abi';

// Конфигурация контрактов
export const CONTRACT_ADDRESSES = {
  TREASURY: '0x7930f06a12416ad57faf5d32f6a742e641313e76',
  PENGU_TOKEN: '0x872309559f33bdb8785A69eaFf51BBD7430b3049', // MockPENGU
  BUYBACK_MANAGER: '0xe426b4a057f0d05c907788f76d42bad51023fe6b',
  FEE_COLLECTOR: '0xa235d76f89d89187048b2abb41cf5ad9c746b18a',
  STRATEGY_CORE: '0xe28ad1258cf2b0fc27da6ff4a586825bcb794cc5',
  STRAT_TOKEN: '0xcceff0ba646de3e0471acbb68c575dd81b76449d',
  WETH: '0x3439153EB7AF838Ad19d56E1571FBD09333C2809',
  ROUTER: '0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c',
} as const;

// Конфигурация сетей
export const NETWORK_CONFIG = {
  // Abstract Mainnet
  ABSTRACT: {
    chainId: 2741, // Abstract mainnet chain ID
    name: 'Abstract Mainnet',
    rpcUrl: 'https://api.mainnet.abs.xyz', // Abstract mainnet RPC URL
    blockExplorer: 'https://abscan.org', // Abstract mainnet explorer
  },
} as const;

// Экспорт ABI для использования в компонентах
export { 
  TREASURY_ABI, 
  ERC20_ABI, 
  BUYBACK_MANAGER_ABI, 
  FEE_COLLECTOR_ABI, 
  STRATEGY_CORE_ABI, 
  STRAT_TOKEN_ABI,
  ROUTER_ABI
};

// Типы для TypeScript
export type TreasuryContract = typeof CONTRACT_ADDRESSES.TREASURY;
export type PenguTokenContract = typeof CONTRACT_ADDRESSES.PENGU_TOKEN;
export type BuybackManagerContract = typeof CONTRACT_ADDRESSES.BUYBACK_MANAGER;
export type FeeCollectorContract = typeof CONTRACT_ADDRESSES.FEE_COLLECTOR;
export type StrategyCoreContract = typeof CONTRACT_ADDRESSES.STRATEGY_CORE;
export type StratTokenContract = typeof CONTRACT_ADDRESSES.STRAT_TOKEN;
export type RouterContract = typeof CONTRACT_ADDRESSES.ROUTER;
