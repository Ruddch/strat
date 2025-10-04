// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/FeeCollector.sol";

contract DeployFeeCollector is Script {
    function run() external {
        vm.startBroadcast();
        
        new FeeCollector(
            0x9F3C922E74577a854AdB3c07a7313C9099cf2c87,  // penguAddress
            0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409,  // router
            0xB4650e966F1080505AE35C0681464823B73d97a5,  // НОВЫЙ strategyCore ⚠️
            0x8DE9041a51C1a23BAB987Ee0fa0aBDB3b4881648,  // treasury
            0x156C7eE65C5A9e6eFc62CE4645B631c5617EF894   // owner
        );
        
        vm.stopBroadcast();
    }
}