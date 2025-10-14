import { TREASURY_ABI, ERC20_ABI } from './treasury-abi';
import { BUYBACK_MANAGER_ABI } from './buyback-manager-abi';
import { FEE_COLLECTOR_ABI } from './fee-collector-abi';
import { STRATEGY_CORE_ABI } from './strategy-core-abi';
import { STRAT_TOKEN_ABI } from './strat-token-abi';
import { ROUTER_ABI } from './router-abi';

// Конфигурация контрактов
export const CONTRACT_ADDRESSES = {
  TREASURY: '0x2fafa047a6174705460732f42854dac966686263',
  PENGU_TOKEN: '0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62', // MockPENGU
  BUYBACK_MANAGER: '0x6fe16e3933345a456eb5550f2f08c746060a9593',
  FEE_COLLECTOR: '0x5f52cc400513555bcc607b6ab87395605db7f69e',
  STRATEGY_CORE: '0xfad5bbdc406888c026312c6108a7f9258631b4c9',
  STRAT_TOKEN: '0x5a4f6f08a3e414924d972f2df8973809ecde6cc6',
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
