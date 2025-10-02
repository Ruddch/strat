// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/StratToken.sol";
import "../src/core/Treasury.sol";
import "../src/core/BuybackManager.sol";
import "../src/core/FeeCollector.sol";
import "../src/core/StrategyCore.sol";
import "../src/mocks/MockPengu.sol";

contract DeployAbstractScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying from:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Abstract testnet addresses from official docs
        address uniswapRouter = 0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409; // UniswapV2Router02
        address wethAddress = 0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d; // WETH9
        console.log("Using UniswapV2Router02:", uniswapRouter);
        console.log("Using WETH9:", wethAddress);

        // 1. Deploy MockPENGU
        MockPengu penguToken = new MockPengu();
        console.log("MockPENGU deployed at:", address(penguToken));

        // 2. Deploy Treasury
        Treasury treasury = new Treasury(address(penguToken), deployer);
        console.log("Treasury deployed at:", address(treasury));

        // 3. Deploy StratToken FIRST (with placeholders)
        StratToken stratToken = new StratToken(
            "Strategy Token", // name
            "STRAT", // symbol
            1_000_000_000 * 1e18, // initialSupply
            payable(deployer), // opsWallet
            deployer, // feeCollector (placeholder - use deployer)
            deployer, // buybackManager (placeholder - use deployer)
            uniswapRouter, // router
            wethAddress // weth
        );
        console.log("StratToken deployed at:", address(stratToken));

        // 4. Deploy BuybackManager (now we have stratToken)
        BuybackManager buybackManager = new BuybackManager(
            address(stratToken), // stratToken ✅
            deployer, // strategyCore (placeholder - use deployer)
            uniswapRouter, // router
            deployer // owner
        );
        console.log("BuybackManager deployed at:", address(buybackManager));

        // 5. Deploy FeeCollector
        FeeCollector feeCollector = new FeeCollector(
            address(penguToken), // pengu
            uniswapRouter, // router
            deployer, // strategyCore (placeholder - use deployer)
            address(treasury), // treasury
            deployer // owner
        );
        console.log("FeeCollector deployed at:", address(feeCollector));

        // 6. Deploy StrategyCore
        StrategyCore strategyCore = new StrategyCore(
            address(penguToken), // pengu
            address(feeCollector), // feeCollector
            uniswapRouter, // router
            address(buybackManager), // buybackManager
            deployer // owner
        );
        console.log("StrategyCore deployed at:", address(strategyCore));

        // 7. Update placeholder addresses
        feeCollector.setStrategyCore(address(strategyCore));

        // 8. Update StratToken addresses (если есть setters)
        // stratToken.setFeeCollector(address(feeCollector));
        // stratToken.setBuybackManager(address(buybackManager));

        // 9. Initialize Treasury
        treasury.startNewEpoch();

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockPENGU:", address(penguToken));
        console.log("StratToken:", address(stratToken));
        console.log("Treasury:", address(treasury));
        console.log("BuybackManager:", address(buybackManager));
        console.log("FeeCollector:", address(feeCollector));
        console.log("StrategyCore:", address(strategyCore));
        console.log("Router used:", uniswapRouter);
    }
}
