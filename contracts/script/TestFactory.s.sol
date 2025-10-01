// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

contract TestFactoryScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        address factory = 0x566d7510dEE58360a64C9827257cF6D0Dc43985E;
        address weth = 0x9EDCde0257F2386Ce177C3a7FCdd97787F0D841d;
        address mockToken = 0x7d6189F0349066e3EC5069D09548f19eFC72aBEF;
        
        console.log("Testing factory.createPair...");
        console.log("Factory:", factory);
        console.log("Token:", mockToken);
        console.log("WETH:", weth);
        
        // Попробуем создать пару
        try IUniswapV2Factory(factory).createPair(mockToken, weth) returns (address pair) {
            console.log("Pair created:", pair);
        } catch Error(string memory reason) {
            console.log("createPair failed:", reason);
        } catch (bytes memory) {
            console.log("createPair failed: unknown error");
        }
        
        vm.stopBroadcast();
    }
}