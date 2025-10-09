// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/core/StratToken.sol";
import "../src/core/BuybackManager.sol";
import "../src/core/FeeCollector.sol";
import "../src/core/StrategyCore.sol";
import "../src/core/Treasury.sol";

contract DeployMinimalScript is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying with:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Constants
        address pengu = 0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62;
        address router = 0xad1eCa41E6F772bE3cb5A48A6141f9bcc1AF9F7c;
        address weth = 0x3439153EB7AF838Ad19d56E1571FBD09333C2809;
        
        // Deploy one by one
        Treasury treasury = new Treasury(pengu, deployer);
        console.log("Treasury:", address(treasury));
        
        StratToken token = new StratToken(
            "StratToken", "STRAT", 1000000000000000000000000000,
            payable(deployer), deployer, deployer, router, weth
        );
        console.log("StratToken:", address(token));
        
        BuybackManager buyback = new BuybackManager(
            address(token), deployer, router, deployer
        );
        console.log("BuybackManager:", address(buyback));
        
        FeeCollector collector = new FeeCollector(
            pengu, router, deployer, address(treasury), deployer
        );
        console.log("FeeCollector:", address(collector));
        
        StrategyCore strategy = new StrategyCore(
            pengu, address(collector), router, address(buyback), deployer
        );
        console.log("StrategyCore:", address(strategy));
        
        vm.stopBroadcast();
        
        console.log("\n=== ADDRESSES ===");
        console.log("Treasury:", address(treasury));
        console.log("StratToken:", address(token));
        console.log("BuybackManager:", address(buyback));
        console.log("FeeCollector:", address(collector));
        console.log("StrategyCore:", address(strategy));
    }
}