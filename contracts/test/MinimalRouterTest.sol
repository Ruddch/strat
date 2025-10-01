// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IRouter {
    function WETH() external view returns (address);
    function factory() external view returns (address);
}

contract MinimalRouterTest is ERC20 {
    address public WETH;
    
    constructor(address router_) ERC20("Test", "TEST") {
        // Только это:
        IRouter router = IRouter(router_);
        WETH = router.WETH();
    }
}