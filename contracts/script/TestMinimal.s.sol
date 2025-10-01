// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../test/MinimalRouterTest.sol";

contract TestMinimalScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Тест router адреса
        address uniswapRouter = 0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409;
        
        console.log("Testing router:", uniswapRouter);
        
        MinimalRouterTest test = new MinimalRouterTest(uniswapRouter);
        
        console.log("Test deployed at:", address(test));
        console.log("WETH address:", test.WETH());
        
        vm.stopBroadcast();
    }
}