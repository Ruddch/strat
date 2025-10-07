// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/core/StratToken.sol";
import "../src/core/BuybackManager.sol";
import "../src/core/FeeCollector.sol";
import "../src/core/StrategyCore.sol";
import "../src/core/Treasury.sol";

contract DeployAbstractMainnetScript is Script {
    function run() external {
        uint256 forkId = vm.createFork(vm.envString("RPC_URL"));
        vm.selectFork(forkId);
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== DEPLOYING TO ABSTRACT MAINNET ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        console.log("ChainID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 🎯 REAL ADDRESSES FOR ABSTRACT MAINNET
        address penguToken = 0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62;  // REAL PENGU
        address uniswapRouter = 0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c; // MAINNET Router
        address wethAddress = 0x3439153EB7AF838Ad19d56E1571FBD09333C2809;   // MAINNET WETH
        
        console.log("Using REAL PENGU:", penguToken);
        console.log("Using Mainnet Router:", uniswapRouter);
        console.log("Using Mainnet WETH:", wethAddress);
        
        // 1. Deploy Treasury (with REAL PENGU)
        Treasury treasury = new Treasury(penguToken, deployer);
        console.log("Treasury deployed:", address(treasury));
        
        // 2. Deploy TEST StratToken
        StratToken stratToken = new StratToken(
            "TEST-560042",           // 🎯 TEST NAME
            "TEST-560042",           // 🎯 TEST SYMBOL
            1_000_000_000 * 1e18,    // initialSupply
            payable(deployer),       // opsWallet
            deployer,               // feeCollector (placeholder)
            deployer,               // buybackManager (placeholder)
            uniswapRouter,          // MAINNET router
            wethAddress             // MAINNET weth
        );
        console.log("TEST StratToken deployed:", address(stratToken));
        
        // 3. Deploy BuybackManager
        BuybackManager buybackManager = new BuybackManager(
            address(stratToken),     // stratToken
            deployer,               // strategyCore (placeholder)
            uniswapRouter,          // MAINNET router
            deployer                // owner
        );
        console.log("BuybackManager deployed:", address(buybackManager));
        
        // 4. Deploy FeeCollector (with REAL PENGU)
        FeeCollector feeCollector = new FeeCollector(
            penguToken,             // 🎯 REAL PENGU TOKEN
            uniswapRouter,          // MAINNET router
            deployer,               // strategyCore (placeholder)
            address(treasury),      // treasury
            deployer                // owner
        );
        console.log("FeeCollector deployed:", address(feeCollector));
        
        // 5. Deploy StrategyCore (with REAL PENGU)
        StrategyCore strategyCore = new StrategyCore(
            penguToken,             // 🎯 REAL PENGU TOKEN
            address(feeCollector),  // feeCollector
            uniswapRouter,          // MAINNET router
            address(buybackManager), // buybackManager
            deployer                // owner
        );
        console.log("StrategyCore deployed:", address(strategyCore));
        
        // 6. Configure contract connections
        console.log("Configuring contract connections...");
        
        feeCollector.setStrategyCore(address(strategyCore));
        console.log("FeeCollector.setStrategyCore");
        
        stratToken.setWallets(
            payable(deployer),
            address(feeCollector),
            address(buybackManager)
        );
        console.log("StratToken.setWallets");
        
        // 7. Authorize FeeCollector in Treasury
        treasury.setAuthorizedCaller(address(feeCollector), true);
        console.log("Treasury.setAuthorizedCaller");
        
        // 8. Initialize Treasury
        treasury.startNewEpoch();
        console.log("Treasury epoch started");
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Network: ABSTRACT MAINNET");
        console.log("Test Token: TEST-560042");
        console.log("Real PENGU:", penguToken);
        console.log("");
        console.log("CONTRACT ADDRESSES:");
        console.log("StratToken (TEST-560042):", address(stratToken));
        console.log("Treasury:", address(treasury));
        console.log("BuybackManager:", address(buybackManager));
        console.log("FeeCollector:", address(feeCollector));
        console.log("StrategyCore:", address(strategyCore));
        console.log("");
        console.log("INFRASTRUCTURE:");
        console.log("PENGU Token:", penguToken);
        console.log("Uniswap Router:", uniswapRouter);
        console.log("WETH:", wethAddress);
        
        console.log("\nAll contracts deployed and configured!");
        console.log("Ready for testing with REAL PENGU tokens!");
    }
}