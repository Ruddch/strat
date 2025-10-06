
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/core/Treasury.sol";

contract DeployTreasuryV2Script is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Treasury treasury = new Treasury(
            0x872309559f33bdb8785A69eaFf51BBD7430b3049, // PENGU
            0x156C7eE65C5A9e6eFc62CE4645B631c5617EF894  // owner
        );

        console.log("NEW TreasuryV2 deployed at:", address(treasury));
        console.log("Remember to:");
        console.log("1. Update FeeCollector.setTreasury()");
        console.log("2. Transfer PENGU tokens if needed");
        console.log("3. Update all authorized callers");

        vm.stopBroadcast();
    }
}
