// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/StrategyCore.sol";

contract DeployStrategyCore is Script {
    function run() external {
        vm.startBroadcast();
        
        new StrategyCore(
            0x9F3C922E74577a854AdB3c07a7313C9099cf2c87,  // penguAddress
            0x1634f62B526cC6eD97D9b5ADe45Ab023d0465cc5,  // NEW feeCollector
            0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409,  // router
            0x2820D10cFC44110E8D1E497c1Fb26C542dFAE2e2,  // buybackManager (из старой настройки)
            0x156C7eE65C5A9e6eFc62CE4645B631c5617EF894   // owner
        );
        
        vm.stopBroadcast();
    }
}