// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/FeeCollector.sol";


contract DeployFeeCollector is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FeeCollector feeCollector = new FeeCollector(
            0x872309559f33bdb8785A69eaFf51BBD7430b3049,  // MockPENGU
            0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409,  // Router
            0xbdB6674F50e84fdedE0b616B50bc5aD1233FFc7D,  // StrategyCore
            0x2532917E5F95eAf93cc1f0A11EEd552340fD9C6B,  // Treasury V4 (новый)
            0x156C7eE65C5A9e6eFc62CE4645B631c5617EF894   // Owner
        );

        console.log("NEW FeeCollector V2 deployed at:", address(feeCollector));
        vm.stopBroadcast();
    }
}