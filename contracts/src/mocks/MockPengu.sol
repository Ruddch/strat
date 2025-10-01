// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPengu is ERC20 {
    constructor() ERC20("Mock PENGU", "PENGU") {
        _mint(msg.sender, 1000000e18); // 1M tokens
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}