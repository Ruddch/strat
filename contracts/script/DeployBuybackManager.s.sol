// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/core/BuybackManager.sol";

contract DeployBuybackManagerScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        BuybackManager buybackManager = new BuybackManager(
            0x0f7D5A61F41E6061598c355529788d4D2F2cab05, // StratToken
            0xbdB6674F50e84fdedE0b616B50bc5aD1233FFc7D, // ПРАВИЛЬНЫЙ StrategyCore 
            0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409, // Router
            0x156C7eE65C5A9e6eFc62CE4645B631c5617EF894  // owner
        );

        console.log("NEW BuybackManager deployed at:", address(buybackManager));
        vm.stopBroadcast();
    }
}