import { formatUnits, parseUnits } from 'viem';
import { TREASURY_ABI, ERC20_ABI } from './treasury-abi';
import { BUYBACK_MANAGER_ABI } from './buyback-manager-abi';
import { FEE_COLLECTOR_ABI } from './fee-collector-abi';
import { STRATEGY_CORE_ABI } from './strategy-core-abi';
import { STRAT_TOKEN_ABI } from './strat-token-abi';
import { CONTRACT_ADDRESSES } from './config';

// Утилиты для работы с контрактами

/**
 * Форматирует баланс токенов из wei в читаемый вид
 */
export function formatTokenBalance(balance: bigint, decimals: number = 18): string {
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  return num.toFixed(2);
}

/**
 * Парсит строку токенов в wei
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  // Parse the amount as a string to preserve precision
  return parseUnits(amount, decimals);
}

/**
 * Форматирует цену токена в компактном виде для очень маленьких значений
 * Например: 0.0000001766 -> "0.0₆1766"
 */
export function formatTokenPrice(price: bigint, decimals: number = 18): string {
  const priceStr = formatUnits(price, decimals);
  testFormatTokenPrice()
  
  // Если число >= 0.0001, используем обычное форматирование
  if (parseFloat(priceStr) >= 0.0001) {
    return parseFloat(priceStr).toFixed(4);
  }
  
  // Для очень маленьких чисел работаем со строкой напрямую
  // Находим позицию первой значащей цифры после десятичной точки
  const decimalIndex = priceStr.indexOf('.');
  if (decimalIndex === -1) {
    return priceStr;
  }
  
  const afterDecimal = priceStr.substring(decimalIndex + 1);
  const firstNonZeroIndex = afterDecimal.search(/[1-9]/);
  
  if (firstNonZeroIndex === -1) {
    return "0.0000";
  }
  
  // Количество нулей после десятичной точки
  const zeroCount = firstNonZeroIndex;
  
  // Берем первые 4 значащие цифры
  const significantDigits = afterDecimal.substring(firstNonZeroIndex, firstNonZeroIndex + 4);
  
  // Формируем строку в формате "0.0ₓYYYY"
  return `0.0${getSubscript(zeroCount)}${significantDigits}`;
}

/**
 * Возвращает подстрочный индекс для числа
 */
function getSubscript(num: number): string {
  const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  return num.toString().split('').map(digit => subscripts[parseInt(digit)]).join('');
}

// Временная функция для тестирования
export function testFormatTokenPrice() {
  const testPrice = BigInt(47928123144487);
  console.log('Test price:', testPrice);
  console.log('formatUnits result:', formatUnits(testPrice, 18));
  console.log('formatTokenPrice result:', formatTokenPrice(testPrice, 18));
}

/**
 * Форматирует адрес для отображения (первые 6 и последние 4 символа)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Проверяет валидность Ethereum адреса
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Конфигурация для wagmi hooks
 */
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

/**
 * Константы для работы с эпохами
 */
export const EPOCH_CONSTANTS = {
  DURATION_DAYS: 7,
  DURATION_SECONDS: 7 * 24 * 60 * 60, // 7 дней в секундах
  CLAIMABLE_EPOCHS: 1, // Только предыдущая эпоха claimable
  EXPIRED_EPOCHS: 3, // Эпохи старше 3 периодов считаются expired
} as const;
