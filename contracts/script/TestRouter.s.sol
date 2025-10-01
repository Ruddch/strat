// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/interfaces/IUniswapV2Router02.sol";

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

contract TestRouterScript is Script {
    function run() external view {
        address router = 0x96ff7D9dbf52FdcAe79157d3b249282c7FABd409;
        
        console.log("Testing router:", router);
        
        // Test WETH call
        address weth = IUniswapV2Router02(router).WETH();
        console.log("WETH address:", weth);
        
        // Test factory call  
        address factory = IUniswapV2Router02(router).factory();
        console.log("Factory address:", factory);
        
        // Test if we can get pair (should be address(0) for new token)
        address mockToken = 0x7d6189F0349066e3EC5069D09548f19eFC72aBEF; // Your MockPengu
        address existingPair = IUniswapV2Factory(factory).getPair(mockToken, weth);
        console.log("Existing pair:", existingPair);
    }
}