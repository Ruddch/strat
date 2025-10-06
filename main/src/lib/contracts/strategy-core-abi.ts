// StrategyCore Contract ABI
export const STRATEGY_CORE_ABI = [
  // View functions
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "lotId",
        "type": "uint256"
      }
    ],
    "name": "getLot",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "amountPengu",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "ethSpent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "avgPriceWeiPerPengu",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct StrategyCore.Lot",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTPLadder",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "multiplierX1000",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "percentBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct StrategyCore.TP[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalLots",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "activeLots",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "headPointer",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tailPointer",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "penguBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tpLevels",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currentPrice",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLastOraclePrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastUpdated",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllActiveLots",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "lotIds",
        "type": "uint256[]"
      },
      {
        "internalType": "struct StrategyCore.Lot[]",
        "name": "activeLots",
        "type": "tuple[]",
        "components": [
          {
            "internalType": "uint256",
            "name": "amountPengu",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "ethSpent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "avgPriceWeiPerPengu",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPenguPrice",
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
    "name": "isPriceFresh",
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
  {
    "inputs": [],
    "name": "getOraclePriceInfo",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastUpdated",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isFresh",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "age",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "penguAddress",
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
    "name": "feeCollector",
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
    "name": "buybackManager",
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
    "name": "maxLotsPerExecution",
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
    "name": "tpExecutionEnabled",
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
        "internalType": "uint256",
        "name": "amountPengu",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ethSpent",
        "type": "uint256"
      }
    ],
    "name": "depositPengu",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newPriceWei",
        "type": "uint256"
      }
    ],
    "name": "updatePenguPrice",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "multiplierX1000",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "percentBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct StrategyCore.TP[]",
        "name": "ladder",
        "type": "tuple[]"
      }
    ],
    "name": "setTPLadder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "lotId",
        "type": "uint256"
      }
    ],
    "name": "checkAndExecuteTP",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "maxLots",
        "type": "uint256"
      }
    ],
    "name": "batchProcessTP",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "lotIds",
        "type": "uint256[]"
      }
    ],
    "name": "checkAndExecuteTPForLots",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "newBuybackManager",
        "type": "address"
      }
    ],
    "name": "setBuybackManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newFeeCollector",
        "type": "address"
      }
    ],
    "name": "setFeeCollector",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_maxLotsPerExecution",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_tpExecutionEnabled",
        "type": "bool"
      }
    ],
    "name": "updateConfig",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "lotId",
        "type": "uint256"
      }
    ],
    "name": "emergencyDeactivateLot",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
