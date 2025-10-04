import { TREASURY_ABI, ERC20_ABI } from './treasury-abi';
import { BUYBACK_MANAGER_ABI } from './buyback-manager-abi';
import { FEE_COLLECTOR_ABI } from './fee-collector-abi';
import { STRATEGY_CORE_ABI } from './strategy-core-abi';
import { STRAT_TOKEN_ABI } from './strat-token-abi';

// Конфигурация контрактов
export const CONTRACT_ADDRESSES = {
  TREASURY: '0x9d5187BC1B838Eb8C80d482247B44e410200B8bA',
  PENGU_TOKEN: '0x872309559f33bdb8785A69eaFf51BBD7430b3049', // MockPENGU
  BUYBACK_MANAGER: '0xF210ACE50f88B984336EDF852ca42F9F74a91668',
  FEE_COLLECTOR: '0xe86c1df3b9F815A9f1CdceA8eAB398503452CE44',
  STRATEGY_CORE: '0xbdB6674F50e84fdedE0b616B50bc5aD1233FFc7D',
  STRAT_TOKEN: '0x0f7D5A61F41E6061598c355529788d4D2F2cab05',
  ROUTER: '0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409',
} as const;

// Конфигурация сетей
export const NETWORK_CONFIG = {
  // Abstract (замените на реальные параметры)
  ABSTRACT: {
    chainId: 11124, // Abstract testnet chain ID
    name: 'Abstract Testnet',
    rpcUrl: 'https://api.testnet.abs.xyz', // TODO: Заменить на реальный RPC URL
    blockExplorer: 'https://testnet.abs.xyz', // TODO: Заменить на реальный explorer
  },
} as const;

// Экспорт ABI для использования в компонентах
export { 
  TREASURY_ABI, 
  ERC20_ABI, 
  BUYBACK_MANAGER_ABI, 
  FEE_COLLECTOR_ABI, 
  STRATEGY_CORE_ABI, 
  STRAT_TOKEN_ABI 
};

// Типы для TypeScript
export type TreasuryContract = typeof CONTRACT_ADDRESSES.TREASURY;
export type PenguTokenContract = typeof CONTRACT_ADDRESSES.PENGU_TOKEN;
export type BuybackManagerContract = typeof CONTRACT_ADDRESSES.BUYBACK_MANAGER;
export type FeeCollectorContract = typeof CONTRACT_ADDRESSES.FEE_COLLECTOR;
export type StrategyCoreContract = typeof CONTRACT_ADDRESSES.STRATEGY_CORE;
export type StratTokenContract = typeof CONTRACT_ADDRESSES.STRAT_TOKEN;
export type RouterContract = typeof CONTRACT_ADDRESSES.ROUTER;
