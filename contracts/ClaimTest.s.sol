// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
interface ITreasury {
    function claimDividends(uint256 epochId, uint256 weightedBalance, uint256 claimAmount, bytes32[] calldata merkleProof) external;
}
contract ClaimTest is Script {
    function run() external {
        vm.startBroadcast();
        
        ITreasury treasury = ITreasury(0x9d5187BC1B838Eb8C80d482247B44e410200B8bA);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = 0xf878cbe67290296acc9793675ebbe1fe7f80cecf640889c214b63437bcd055e9;
        
        treasury.claimDividends(3, 900000000000000000, 2210309896751924992, proof);
        
        vm.stopBroadcast();
    }
}
