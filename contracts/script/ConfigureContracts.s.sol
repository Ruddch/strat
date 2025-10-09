// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IStratToken {
    function setWallets(address payable ops, address collector, address buyback) external;
    function setCoordinator(address payable coordinator) external;
    function createPair() external;
    function approve(address spender, uint256 amount) external returns (bool);
    function pair() external view returns (address);
    function balanceOf(address account) external view returns (uint256);
}

interface IBuybackManager {
    function updateStrategyCore(address newStrategyCore) external;
    function setBuybackThreshold(uint256 threshold) external;
}

interface IFeeCollector {
    function setStrategyCore(address strategyCore) external;
    function setThreshold(uint256 threshold) external;
    function setUseAmount(uint256 amount) external;
}

interface IStrategyCore {
    function setCoordinator(address coordinator) external;
    function unpause() external;
}

interface ITreasury {
    function setAuthorizedCaller(address caller, bool authorized) external;
    function startNewEpoch() external;
}

interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

contract ConfigureContractsScript is Script {
    
    // 🎯 АДРЕСА ИЗ ДЕПЛОЯ - ВСТАВЬТЕ СВОИ!
                                
    address constant TREASURY = 0x7930F06a12416Ad57faf5D32F6A742e641313E76;
    address constant STRAT_TOKEN = 0xcCeff0BA646dE3e0471AcbB68c575dd81b76449D;
    address constant BUYBACK_MANAGER = 0xe426B4a057F0d05C907788f76d42Bad51023fE6B;
    address constant FEE_COLLECTOR = 0xA235d76F89d89187048B2aBb41cF5Ad9C746b18A;
    address constant STRATEGY_CORE = 0xE28Ad1258CF2B0FC27Da6fF4A586825BCB794cc5;
    
    // Константы
    address constant COORDINATOR = 0x7c32347c7Aed1ADDb41426563aed3615961001cC;
    address constant UNISWAP_ROUTER = 0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c;
    
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== CONFIGURING CONTRACTS ===");
        console.log("Deployer:", deployer);
        console.log("Coordinator:", COORDINATOR);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Настройка соединений контрактов
        _configureConnections(deployer);
        
        // 2. Установка координаторов
        _setCoordinators();
        
        // 3. Создание пары и добавление ликвидности
        //_createTradingPair(deployer);
        
        // 4. Финальные настройки
        _finalConfiguration();
        
        vm.stopBroadcast();
        
        // 5. Отчет
        _printConfiguration();
    }
    
    function _configureConnections(address deployer) private {
        console.log("\n=== CONFIGURING CONNECTIONS ===");
        
        // Настройка FeeCollector
        IFeeCollector(FEE_COLLECTOR).setStrategyCore(STRATEGY_CORE);
        console.log("FeeCollector.setStrategyCore");
        
        // Настройка StratToken
        IStratToken(STRAT_TOKEN).setWallets(
            payable(deployer),
            FEE_COLLECTOR,
            BUYBACK_MANAGER
        );
        console.log("StratToken.setWallets");
        
        // Настройка BuybackManager
        IBuybackManager(BUYBACK_MANAGER).updateStrategyCore(STRATEGY_CORE);
        console.log("BuybackManager.updateStrategyCore");
        
        // Авторизация Treasury
        ITreasury(TREASURY).setAuthorizedCaller(FEE_COLLECTOR, true);
        console.log("Treasury.setAuthorizedCaller");
        
        // Запуск эпохи Treasury
        ITreasury(TREASURY).startNewEpoch();
        console.log("Treasury epoch started");
    }
    
    function _setCoordinators() private {
        console.log("\n=== SETTING COORDINATORS ===");
        
        // Установка координатора в StratToken
        IStratToken(STRAT_TOKEN).setCoordinator(payable(COORDINATOR));
        console.log("StratToken coordinator set");
        
        // Установка координатора в StrategyCore
        IStrategyCore(STRATEGY_CORE).setCoordinator(COORDINATOR);
        console.log("StrategyCore coordinator set");
    }
    
    function _createTradingPair(address deployer) private {
        console.log("\n=== CREATING TRADING PAIR ===");
        
        // Проверяем текущую пару
        address existingPair = IStratToken(STRAT_TOKEN).pair();
        console.log("Current pair address:", existingPair);
        
        if (existingPair == address(0)) {
            console.log("Creating new pair with low-level call...");
            
            // Точная копия cast send
            (bool success,) = STRAT_TOKEN.call{gas: 1000000}(
                abi.encodeWithSignature("createPair()")
            );
            
            require(success, "createPair call failed");
            console.log("createPair executed successfully");
            
            // Проверяем результат
            address newPair = IStratToken(STRAT_TOKEN).pair();
            console.log("New pair address:", newPair);
            require(newPair != address(0), "Pair was not created");
        } else {
            console.log("Pair already exists");
        }

        // Теперь добавляем ликвидность
        _addLiquidityToPair(deployer);
    }

    function _addLiquidityToPair(address deployer) private {
        console.log("Adding liquidity...");
        
        uint256 tokenBalance = IStratToken(STRAT_TOKEN).balanceOf(deployer);
        console.log("Token balance:", tokenBalance);
        
        uint256 liquidityAmount = 1_000_000_000 * 1e18;
        
        // Апрув БЕЗ try-catch
        bool approveSuccess = IStratToken(STRAT_TOKEN).approve(UNISWAP_ROUTER, liquidityAmount);
        require(approveSuccess, "Approve failed");
        console.log("Tokens approved");
        
        // Ликвидность БЕЗ try-catch - используем точно те же параметры что работали вручную
        uint256 ethAmount = 0.00001 ether;
        
        IUniswapV2Router02(UNISWAP_ROUTER).addLiquidityETH{value: ethAmount}(
            STRAT_TOKEN,
            liquidityAmount,
            0,
            0,
            deployer,
            block.timestamp + 1800
        );
        
        console.log("Liquidity added with ETH:", ethAmount);
    }
    
    function _finalConfiguration() private {
        console.log("\n=== FINAL CONFIGURATION ===");
        
        // Снятие паузы с StrategyCore
        IStrategyCore(STRATEGY_CORE).unpause();
        console.log("StrategyCore unpaused");
        
        // Установка порогов FeeCollector (0.00001 ETH)
        uint256 feeThreshold = 0.00001 ether;
        IFeeCollector(FEE_COLLECTOR).setThreshold(feeThreshold);
        IFeeCollector(FEE_COLLECTOR).setUseAmount(feeThreshold);
        console.log("FeeCollector thresholds set:", feeThreshold);
        
        // Установка порога BuybackManager (0.000001 ETH)  
        uint256 buybackThreshold = 0.000001 ether;
        IBuybackManager(BUYBACK_MANAGER).setBuybackThreshold(buybackThreshold);
        console.log("BuybackManager threshold set:", buybackThreshold);
    }
    

    function _printConfiguration() private view {
        console.log("\n================================");
        console.log("CONFIGURATION COMPLETE!");
        console.log("================================\n");
        
        console.log("CONTRACT ADDRESSES:");
        console.log("Treasury:       ", TREASURY);
        console.log("StratToken:     ", STRAT_TOKEN);
        console.log("BuybackManager: ", BUYBACK_MANAGER);
        console.log("FeeCollector:   ", FEE_COLLECTOR);
        console.log("StrategyCore:   ", STRATEGY_CORE);
        console.log("Trading Pair:   ", IStratToken(STRAT_TOKEN).pair());
        
        console.log("\nACCESS CONTROL:");
        console.log("Coordinator:    ", COORDINATOR);
        
        console.log("\nSETTINGS:");
        console.log("Fee Threshold:     0.00001 ETH");
        console.log("Buyback Threshold: 0.000001 ETH");
        console.log("TP Target:        +12%");
        console.log("TP Sell Amount:   100%");
        console.log("Strategy Status:  ACTIVE");
        
        console.log("\nALL SYSTEMS READY!");
    }
}