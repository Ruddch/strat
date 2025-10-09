"use client";

import { useWriteContract, useAccount, useReadContract } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { CONTRACT_ADDRESSES, ROUTER_ABI, STRAT_TOKEN_ABI } from "@/lib/contracts/config";

export function useSellTokens() {
  const { writeContract, isPending, error } = useWriteContract();
  const { address } = useAccount();

  // Проверяем текущий allowance
  const { data: allowance } = useReadContract({
    address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
    abi: STRAT_TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACT_ADDRESSES.ROUTER] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const sellTokens = async (tokenAmount: string) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const tokenAmountWei = parseUnits(tokenAmount, 18);
    
    // Путь для свапа: STRAT Token -> ETH
    const path = [
      CONTRACT_ADDRESSES.STRAT_TOKEN,
      CONTRACT_ADDRESSES.WETH
    ];

    // Минимальное количество ETH (5% slippage)
    const amountOutMin = BigInt(0); // Можно добавить расчет минимального количества

    // Дедлайн (20 минут)
    const deadline = Math.floor(Date.now() / 1000) + 1200;

    try {
      // Проверяем, достаточно ли allowance для продажи
      const currentAllowance = allowance || BigInt(0);
      console.log("allowance", allowance);
      
      if (currentAllowance < tokenAmountWei) {
        // Если allowance недостаточно, запрашиваем approve
        await writeContract({
          address: CONTRACT_ADDRESSES.STRAT_TOKEN as `0x${string}`,
          abi: STRAT_TOKEN_ABI,
          functionName: "approve",
          args: [CONTRACT_ADDRESSES.ROUTER, maxUint256],
        });
      }

      // Выполняем продажу
      await writeContract({
        address: CONTRACT_ADDRESSES.ROUTER as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens",
        args: [tokenAmountWei, amountOutMin, path, address, BigInt(deadline)],
      });
    } catch (err) {
      console.error("Error selling tokens:", err);
      throw err;
    }
  };

  return {
    sellTokens,
    isPending,
    error,
    allowance, // Экспортируем allowance для отображения статуса
  };
}
