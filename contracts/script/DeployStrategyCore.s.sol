// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/StrategyCore.sol";

contract DeployStrategyCore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        StrategyCore strategyCore = new StrategyCore(
            0x872309559f33bdb8785A69eaFf51BBD7430b3049,  // MockPENGU (ИСПРАВЛЕНО)
            0xe86c1df3b9F815A9f1CdceA8eAB398503452CE44,  // FeeCollector (АКТУАЛЬНЫЙ)
            0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409,  // router
            0xF210ACE50f88B984336EDF852ca42F9F74a91668,  // BuybackManager (ИСПРАВЛЕНО)
            0x156C7eE65C5A9e6eFc62CE4645B631c5617EF894   // owner
        );

        console.log("NEW StrategyCore deployed at:", address(strategyCore));
        vm.stopBroadcast();
    }
}