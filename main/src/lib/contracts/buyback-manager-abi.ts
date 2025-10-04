// BuybackManager Contract ABI
export const BUYBACK_MANAGER_ABI = [
  // View functions
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "_totalETHReceived",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalETHUsedForBuyback",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalSTRATBurned",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalBuybacks",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalCallerRewards",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_pendingETH",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_contractETHBalance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getConfig",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "_buybackThreshold",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_slippageBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_callerRewardBps",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_autoBuybackEnabled",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "_router",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      }
    ],
    "name": "getExpectedSTRAT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "expectedSTRAT",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSTRAT",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "canTriggerBuyback",
    "outputs": [
      {
        "internalType": "bool",
        "name": "canTrigger",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "ethAvailable",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ethNeeded",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stratTokenAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "strategyCore",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "router",
    "outputs": [
      {
        "internalType": "contract IUniswapV2Router02",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buybackThreshold",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingETH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "autoBuybackEnabled",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "receiveFromStrategy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "triggerBuyback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newThreshold",
        "type": "uint256"
      }
    ],
    "name": "setBuybackThreshold",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newSlippageBps",
        "type": "uint256"
      }
    ],
    "name": "setSlippage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newRewardBps",
        "type": "uint256"
      }
    ],
    "name": "setCallerReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "enabled",
        "type": "bool"
      }
    ],
    "name": "setAutoBuyback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newRouter",
        "type": "address"
      }
    ],
    "name": "setRouter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "emergencyWithdrawETH",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "emergencyWithdrawToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "forceExecuteBuyback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
