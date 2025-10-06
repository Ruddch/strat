
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

interface ITreasury {
    function claimDividends(uint256 epochId, uint256 weightedBalance, uint256 claimAmount, bytes32[] calldata merkleProof) external;
    function currentEpoch() external view returns (uint256);
}

contract SimpleSecurityTest is Script {
    ITreasury treasury = ITreasury(0x9d5187BC1B838Eb8C80d482247B44e410200B8bA);
    
    function run() external {
        vm.startBroadcast();
        
        testDoubleClaimProtection();
        testInvalidProofProtection();
        testOldEpochProtection();
        
        vm.stopBroadcast();
    }
    
    function testDoubleClaimProtection() public {
        console.log("=== TEST 1: Double Claim Protection ===");
        
        bytes32[] memory validProof = new bytes32[](1);
        validProof[0] = bytes32(0x477a8a3ac2c43f2074ec36c89e8abeb3ccff3656150ab7c50333a843751911e8);
        
        try treasury.claimDividends(5, 900000000000000000, 2210309896751924992, validProof) {
            console.log("ERROR: Double claim succeeded!");
        } catch {
            console.log("SUCCESS: Double claim blocked");
        }
    }
    
    function testInvalidProofProtection() public {
        console.log("\n=== TEST 2: Invalid Proof Protection ===");
        
        bytes32[] memory fakeProof = new bytes32[](1);
        fakeProof[0] = bytes32(0x1111111111111111111111111111111111111111111111111111111111111111);
        
        uint256 claimableEpoch = treasury.currentEpoch() - 1;
        try treasury.claimDividends(claimableEpoch, 1000000000000000000, 1000000000000000000, fakeProof) {
            console.log("ERROR: Invalid proof accepted!");
        } catch {
            console.log("SUCCESS: Invalid proof rejected");
        }
    }
    
    function testOldEpochProtection() public {
        console.log("\n=== TEST 3: Old Epoch Protection ===");
        
        bytes32[] memory fakeProof = new bytes32[](1);
        fakeProof[0] = bytes32(0x2222222222222222222222222222222222222222222222222222222222222222);
        
        uint256 current = treasury.currentEpoch();
        if (current >= 3) {
            try treasury.claimDividends(current - 2, 1000000000000000000, 1000000000000000000, fakeProof) {
                console.log("ERROR: Old epoch claim succeeded!");
            } catch {
                console.log("SUCCESS: Old epoch claim blocked");
            }
        }
    }
}

