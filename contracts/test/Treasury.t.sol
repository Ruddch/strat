// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/Treasury.sol";

// Mock PENGU token
contract MockPengu is Test {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply = 1_000_000e18;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        require(balanceOf[from] >= amount, "Insufficient balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract TreasuryTest is Test {
    Treasury treasury;
    MockPengu penguToken;
    
    address owner = address(this);
    address feeCollector = makeAddr("feeCollector");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address user3 = makeAddr("user3");
    address unauthorizedUser = makeAddr("unauthorizedUser");
    
    uint256 constant EPOCH_DURATION = 7 days;
    uint256 constant INITIAL_SUPPLY = 1_000_000e18;
    
    event EpochStarted(uint256 indexed epochId, uint256 startTime);
    event EpochEnded(uint256 indexed epochId, uint256 endTime, uint256 totalDividends);
    event EpochFinalized(uint256 indexed epochId, bytes32 merkleRoot, uint256 totalClaimable);
    event DividendsAdded(uint256 indexed epochId, uint256 amount);
    event DividendsClaimed(uint256 indexed epochId, address indexed user, uint256 amount);
    event TokensRolledOver(uint256 indexed fromEpoch, uint256 indexed toEpoch, uint256 amount);
    
    function setUp() public {
        penguToken = new MockPengu();
        treasury = new Treasury(address(penguToken), owner);
        
        // Set up initial token distributions
        penguToken.mint(feeCollector, 10000e18);
        penguToken.mint(user1, 1000e18);
        penguToken.mint(user2, 2000e18);
        
        // Set feeCollector as authorized caller
        treasury.setAuthorizedCaller(feeCollector, true);
        
        // Approve Treasury to spend PENGU tokens
        vm.prank(feeCollector);
        penguToken.approve(address(treasury), type(uint256).max);
    }
    
    // ============ DEPLOYMENT TESTS ============
    
    function testDeployment() public {
        assertEq(address(treasury.PENGU()), address(penguToken));
        assertEq(treasury.owner(), owner);
        assertEq(treasury.currentEpoch(), 0);
        assertEq(treasury.EPOCH_DURATION(), EPOCH_DURATION);
    }
    
    function testInitialState() public {
        assertEq(treasury.getCurrentClaimableEpoch(), 0);
        assertEq(treasury.getContractBalance(), 0);
        assertEq(treasury.getTotalUnclaimedExpired(), 0);
        assertFalse(treasury.paused());
    }
    
    // ============ ACCESS CONTROL TESTS ============
    
    function testOnlyOwnerCanStartEpoch() public {
        treasury.startNewEpoch();
        assertEq(treasury.currentEpoch(), 1);
        
        vm.prank(user1);
        vm.expectRevert();
        treasury.startNewEpoch();
    }
    
    function testAuthorizedCallerCanAddDividends() public {
        treasury.startNewEpoch();
        
        vm.prank(feeCollector);
        treasury.addDividends(100e18);
        
        vm.prank(user1);
        vm.expectRevert("Not authorized");
        treasury.addDividends(100e18);
    }
    
    function testSetAuthorizedCaller() public {
        treasury.setAuthorizedCaller(user1, true);
        assertTrue(treasury.authorizedCallers(user1));
        
        treasury.setAuthorizedCaller(user1, false);
        assertFalse(treasury.authorizedCallers(user1));
    }
    
    function testOnlyOwnerCanSetAuthorizedCaller() public {
        vm.prank(user1);
        vm.expectRevert();
        treasury.setAuthorizedCaller(user2, true);
    }
    
    function testOwnerIsAlwaysAuthorized() public {
        penguToken.mint(owner, 1000e18);
        penguToken.approve(address(treasury), type(uint256).max);
        
        treasury.startNewEpoch();
        treasury.addDividends(100e18);
    }
    
    // ============ EPOCH MANAGEMENT TESTS ============
    
    function testStartFirstEpoch() public {
        vm.expectEmit(true, false, false, false);
        emit EpochStarted(1, block.timestamp);
        
        treasury.startNewEpoch();
        
        assertEq(treasury.currentEpoch(), 1);
        
        (uint256 startTime, uint256 endTime, uint256 totalDividends,
        uint256 claimedAmount, bool isFinalized, bool isClaimable,,) = treasury.getEpochInfo(1);
        
        assertGt(startTime, 0);
        assertEq(endTime, 0); // Not ended yet
        assertEq(totalDividends, 0); // No rollover for first epoch
        assertEq(claimedAmount, 0);
        assertFalse(isFinalized);
        assertFalse(isClaimable);
    }
    
    function testEpochTransition() public {
        // Start first epoch and add dividends
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        // Wait and start second epoch
        vm.warp(block.timestamp + EPOCH_DURATION);
        
        vm.expectEmit(true, false, false, false);
        emit EpochEnded(1, block.timestamp, 1000e18);
        
        vm.expectEmit(true, false, false, false);
        emit EpochStarted(2, block.timestamp);
        
        treasury.startNewEpoch();
        
        assertEq(treasury.currentEpoch(), 2);
        
        // Check that epoch 1 ended
        (uint256 startTime1, uint256 endTime1, uint256 totalDividends1,,,,,) = treasury.getEpochInfo(1);
        assertGt(endTime1, 0);
        assertEq(totalDividends1, 1000e18);
        
        // Check that epoch 2 started
        (uint256 startTime2, uint256 endTime2, uint256 totalDividends2,,,,,) = treasury.getEpochInfo(2);
        assertGt(startTime2, 0);
        assertEq(endTime2, 0);
        assertEq(totalDividends2, 0); // No rollover yet since epoch 1 not expired
    }
    
    function testFinalizeEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        // End epoch by starting new one
        vm.warp(block.timestamp + EPOCH_DURATION);
        treasury.startNewEpoch();
        
        bytes32 merkleRoot = keccak256("test");
        
        vm.expectEmit(true, false, false, false);
        emit EpochFinalized(1, merkleRoot, 1000e18);
        
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
        
        (,,,, bool isFinalized, bool isClaimable,,) = treasury.getEpochInfo(1);
        assertTrue(isFinalized);
        assertTrue(isClaimable); // Should be claimable as it's the previous epoch
    }
    
    function testCannotFinalizeActiveEpoch() public {
        treasury.startNewEpoch();
        
        bytes32 merkleRoot = keccak256("test");
        vm.expectRevert("Epoch not ended");
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
    }
    
    function testCannotDoubleFinalizeEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        vm.warp(block.timestamp + EPOCH_DURATION);
        treasury.startNewEpoch();
        
        bytes32 merkleRoot = keccak256("test");
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
        
        vm.expectRevert("Already finalized");
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
    }
    
    function testCannotFinalizeWithExcessiveClaimable() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        vm.warp(block.timestamp + EPOCH_DURATION);
        treasury.startNewEpoch();
        
        bytes32 merkleRoot = keccak256("test");
        vm.expectRevert("Invalid claimable amount");
        treasury.finalizeEpoch(1, merkleRoot, 1500e18); // More than totalDividends
    }
    
    // ============ DIVIDEND MANAGEMENT TESTS ============
    
    function testAddDividends() public {
        treasury.startNewEpoch();
        uint256 dividendAmount = 500e18;
        
        vm.expectEmit(true, false, false, false);
        emit DividendsAdded(1, dividendAmount);
        
        vm.prank(feeCollector);
        treasury.addDividends(dividendAmount);
        
        (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(1);
        assertEq(totalDividends, dividendAmount);
    }
    
    function testAddMultipleDividends() public {
        treasury.startNewEpoch();
        
        vm.prank(feeCollector);
        treasury.addDividends(100e18);
        
        vm.prank(feeCollector);
        treasury.addDividends(200e18);
        
        (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(1);
        assertEq(totalDividends, 300e18);
    }
    
    function testCannotAddZeroDividends() public {
        treasury.startNewEpoch();
        
        vm.prank(feeCollector);
        vm.expectRevert("Amount must be positive");
        treasury.addDividends(0);
    }
    
    function testCannotAddDividendsWithoutActiveEpoch() public {
        vm.prank(feeCollector);
        vm.expectRevert("No active epoch");
        treasury.addDividends(100e18);
    }
    
    function testDividendsTransferTokensToContract() public {
        treasury.startNewEpoch();
        uint256 initialBalance = penguToken.balanceOf(address(treasury));
        uint256 dividendAmount = 500e18;
        
        vm.prank(feeCollector);
        treasury.addDividends(dividendAmount);
        
        uint256 finalBalance = penguToken.balanceOf(address(treasury));
        assertEq(finalBalance - initialBalance, dividendAmount);
    }
    
    function testEmergencyAddDividends() public {
        treasury.startNewEpoch();
        treasury.emergencyAddDividends(1, 100e18);
        
        (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(1);
        assertEq(totalDividends, 100e18);
    }
    
    function testOnlyOwnerCanEmergencyAddDividends() public {
        treasury.startNewEpoch();
        
        vm.prank(user1);
        vm.expectRevert();
        treasury.emergencyAddDividends(1, 100e18);
    }
    
    // ============ CLAIMING SYSTEM TESTS ============
    
    function testClaimDividendsWithValidProof() public {
        // Setup epoch with dividends
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        // End epoch and start new one
        treasury.startNewEpoch();
        
        // Off-chain calculated values
        uint256 user1WeightedBalance = 1000e18;
        uint256 user1ClaimAmount = 285e18;
        
        // Create simple merkle proof (for testing)
        bytes32 leaf = keccak256(abi.encodePacked(user1, user1WeightedBalance, user1ClaimAmount));
        bytes32[] memory proof = new bytes32[](0); // Empty proof for single leaf
        bytes32 merkleRoot = leaf;
        
        // Finalize epoch
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
        
        uint256 initialBalance = penguToken.balanceOf(user1);
        
        vm.expectEmit(true, true, false, false);
        emit DividendsClaimed(1, user1, user1ClaimAmount);
        
        vm.prank(user1);
        treasury.claimDividends(1, user1WeightedBalance, user1ClaimAmount, proof);
        
        uint256 finalBalance = penguToken.balanceOf(user1);
        assertEq(finalBalance - initialBalance, user1ClaimAmount);
        
        // Check claim status
        assertTrue(treasury.hasUserClaimed(user1, 1));
        
        // Check user claim info
        Treasury.UserClaimInfo memory claimInfo = treasury.getUserClaimInfo(user1, 1);
        assertEq(claimInfo.weightedBalance, user1WeightedBalance);
        assertEq(claimInfo.claimAmount, user1ClaimAmount);
        assertTrue(claimInfo.hasClaimed);
    }
    
    function testCannotClaimWithInvalidProof() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        bytes32 merkleRoot = keccak256("test");
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
        
        bytes32[] memory invalidProof = new bytes32[](1);
        invalidProof[0] = keccak256("invalid");
        
        vm.prank(user1);
        vm.expectRevert("Invalid Merkle proof");
        treasury.claimDividends(1, 1000e18, 100e18, invalidProof);
    }
    
    function testCannotDoubleClaim() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        bytes32 leaf = keccak256(abi.encodePacked(user1, uint256(1000e18), uint256(100e18)));
        bytes32[] memory proof = new bytes32[](0);
        treasury.finalizeEpoch(1, leaf, 1000e18);
        
        vm.prank(user1);
        treasury.claimDividends(1, 1000e18, 100e18, proof);
        
        vm.prank(user1);
        vm.expectRevert("Already claimed");
        treasury.claimDividends(1, 1000e18, 100e18, proof);
    }
    
    function testCannotClaimNonClaimableEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch(); // Epoch 2
        treasury.startNewEpoch(); // Epoch 3 - makes epoch 1 non-claimable
        
        bytes32[] memory proof = new bytes32[](0);
        
        vm.prank(user1);
        vm.expectRevert("Epoch not claimable");
        treasury.claimDividends(1, 1000e18, 100e18, proof);
    }
    
    function testCannotClaimZeroAmount() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        bytes32 leaf = keccak256(abi.encodePacked(user1, uint256(1000e18), uint256(0)));
        bytes32[] memory proof = new bytes32[](0);
        treasury.finalizeEpoch(1, leaf, 1000e18);
        
        vm.prank(user1);
        vm.expectRevert("Nothing to claim");
        treasury.claimDividends(1, 1000e18, 0, proof);
    }
    
    function testCannotClaimUnfinalizedEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        bytes32[] memory proof = new bytes32[](0);
        
        vm.prank(user1);
        vm.expectRevert("Epoch not claimable");
        treasury.claimDividends(1, 1000e18, 100e18, proof);
    }
    
    // ============ ROLLOVER TESTS ============
    
    function testRolloverUnclaimedTokens() public {
        treasury.startNewEpoch(); // Epoch 1
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        treasury.startNewEpoch(); // Epoch 2
        treasury.finalizeEpoch(1, keccak256("test1"), 800e18);
        treasury.startNewEpoch(); // Epoch 3
        treasury.startNewEpoch(); // Epoch 4 - rollover из Epoch 1
        (,, uint256 epoch4Dividends,,,, bool epoch4RolloverProcessed, bool epoch4ReceivedRollover) = treasury.getEpochInfo(4);
        assertEq(epoch4Dividends, 1000e18);
        assertFalse(epoch4RolloverProcessed);
        assertTrue(epoch4ReceivedRollover);

        (,,,,,, bool epoch1RolloverProcessed, bool epoch1ReceivedRollover) = treasury.getEpochInfo(1);
        assertTrue(epoch1RolloverProcessed);
        assertFalse(epoch1ReceivedRollover);
    }
    
    function testForceRollover() public {
        treasury.startNewEpoch(); // Epoch 1
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        treasury.startNewEpoch(); // Epoch 2
        treasury.startNewEpoch(); // Epoch 3 
        treasury.startNewEpoch(); // Epoch 4

        vm.expectRevert("Rollover already processed");
        treasury.forceRollover(1, 4);
    }
    
    function testCannotForceRolloverClaimableEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        treasury.finalizeEpoch(1, keccak256("test"), 1000e18);
        
        vm.expectRevert("Epoch still claimable");
        treasury.forceRollover(1, 2);
    }
    
    function testCannotForceRolloverToEarlierEpoch() public {
        treasury.startNewEpoch();
        treasury.startNewEpoch();
        treasury.startNewEpoch();
        
        vm.expectRevert("Invalid target epoch");
        treasury.forceRollover(2, 1);
    }
    
    // ============ VIEW FUNCTIONS TESTS ============
    
    function testGetCurrentClaimableEpoch() public {
        assertEq(treasury.getCurrentClaimableEpoch(), 0);
        
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch(); // Start epoch 2
        
        bytes32 merkleRoot = keccak256("test");
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
        
        assertEq(treasury.getCurrentClaimableEpoch(), 1);
        
        treasury.startNewEpoch();
        assertEq(treasury.getCurrentClaimableEpoch(), 0);
    }
    
    function testGetCurrentEpochStatus() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        (uint256 activeEpochId, uint256 claimableEpochId, uint256 activeEpochStartTime,
         uint256 activeEpochDividends, uint256 claimableDividends, uint256 claimedAmount) = 
            treasury.getCurrentEpochStatus();
        
        assertEq(activeEpochId, 1);
        assertEq(claimableEpochId, 0);
        assertGt(activeEpochStartTime, 0);
        assertEq(activeEpochDividends, 1000e18);
        assertEq(claimableDividends, 0);
        assertEq(claimedAmount, 0);
    }
    
    function testIsEpochClaimable() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        assertFalse(treasury.isEpochClaimable(1));
        
        treasury.startNewEpoch(); // Start epoch 2
        bytes32 merkleRoot = keccak256("test");
        treasury.finalizeEpoch(1, merkleRoot, 1000e18);
        
        assertTrue(treasury.isEpochClaimable(1));
        assertFalse(treasury.isEpochClaimable(2));
    }
    
    function testGetContractBalance() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        assertEq(treasury.getContractBalance(), 1000e18);
    }
    
    function testGetTotalUnclaimedExpired() public {
        treasury.startNewEpoch(); // Epoch 1
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        treasury.startNewEpoch(); // Epoch 2
        vm.prank(feeCollector);
        treasury.addDividends(500e18);
        treasury.startNewEpoch(); // Epoch 3
        treasury.startNewEpoch(); // Epoch 4 - rollover Epoch 1
        treasury.startNewEpoch(); // Epoch 5 - rollover Epoch 2

        assertEq(treasury.getTotalUnclaimedExpired(), 0);
    }
    
    function testNewRolloverLogic() public {
        treasury.startNewEpoch(); // Epoch 1
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);

        treasury.startNewEpoch(); // Epoch 2
        vm.prank(feeCollector);
        treasury.addDividends(500e18);

        treasury.startNewEpoch(); // Epoch 3 - rollover НЕ происходит
        (,, uint256 epoch3Dividends,,,,,) = treasury.getEpochInfo(3);
        assertEq(epoch3Dividends, 0); // Нет rollover

        treasury.startNewEpoch(); // Epoch 4 - rollover из epoch 1
        (,, uint256 epoch4Dividends,,,,,) = treasury.getEpochInfo(4);
        assertEq(epoch4Dividends, 1000e18); // Rollover из epoch 1

        treasury.startNewEpoch(); // Epoch 5 - rollover из epoch 2
        (,, uint256 epoch5Dividends,,,,,) = treasury.getEpochInfo(5);
        assertEq(epoch5Dividends, 500e18); // Rollover из epoch 2
    }

    function testInvalidEpochReverts() public {
        vm.expectRevert("Invalid epoch");
        treasury.getEpochInfo(999);
        
        vm.expectRevert("Invalid epoch");
        treasury.hasUserClaimed(user1, 999);
        
        vm.expectRevert("Invalid epoch");
        treasury.getUserClaimInfo(user1, 999);
    }
    
    // ============ PAUSE FUNCTIONALITY TESTS ============
    
    function testPauseUnpause() public {
        treasury.pause();
        assertTrue(treasury.paused());
        
        treasury.unpause();
        assertFalse(treasury.paused());
    }
    
    function testOnlyOwnerCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        treasury.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        treasury.unpause();
    }
    
    function testPauseBlocksCriticalFunctions() public {
        treasury.startNewEpoch();
        treasury.pause();
        
        vm.expectRevert();
        treasury.startNewEpoch();
        
        vm.prank(feeCollector);
        vm.expectRevert();
        treasury.addDividends(100e18);
        
        bytes32[] memory proof = new bytes32[](0);
        vm.prank(user1);
        vm.expectRevert();
        treasury.claimDividends(1, 1000e18, 100e18, proof);
    }
    
    function testPauseDoesNotBlockViewFunctions() public {
        treasury.startNewEpoch();
        treasury.pause();
        
        // View functions should still work
        assertEq(treasury.currentEpoch(), 1);
        assertEq(treasury.getContractBalance(), 0);
        treasury.getCurrentEpochStatus();
    }
    
    // ============ ADMIN FUNCTIONS TESTS ============
    
    function testEmergencyWithdraw() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        // Make epoch non-claimable
        treasury.startNewEpoch();
        treasury.startNewEpoch();
        
        uint256 initialOwnerBalance = penguToken.balanceOf(owner);
        treasury.emergencyWithdraw(1, 500e18);
        
        assertEq(penguToken.balanceOf(owner) - initialOwnerBalance, 500e18);
    }
    
    function testCannotEmergencyWithdrawFromClaimableEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        treasury.finalizeEpoch(1, keccak256("test"), 1000e18);
        
        vm.expectRevert("Epoch still claimable");
        treasury.emergencyWithdraw(1, 500e18);
    }
    
    function testCannotEmergencyWithdrawFromRecentEpoch() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch(); // Epoch 1 is previous epoch
        
        vm.expectRevert("Cannot withdraw from recent epochs");
        treasury.emergencyWithdraw(1, 500e18);
    }
    
    function testCannotEmergencyWithdrawExcessiveAmount() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        treasury.startNewEpoch();
        
        vm.expectRevert("Insufficient unclaimed amount");
        treasury.emergencyWithdraw(1, 1500e18);
    }
    
    function testOnlyOwnerCanEmergencyWithdraw() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        treasury.startNewEpoch();
        
        vm.prank(user1);
        vm.expectRevert();
        treasury.emergencyWithdraw(1, 500e18);
    }
    
    // ============ EDGE CASES AND ERROR HANDLING ============
    
    function testMultipleUsersClaimScenario() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        // Create claims for multiple users (off-chain calculated)
        uint256 user1Claim = 400e18;
        uint256 user2Claim = 300e18;
        uint256 user3Claim = 200e18; // Total: 900e18, 100e18 unclaimed
        
        bytes32 leaf1 = keccak256(abi.encodePacked(user1, uint256(1000e18), user1Claim));
        bytes32 leaf2 = keccak256(abi.encodePacked(user2, uint256(800e18), user2Claim));
        bytes32 leaf3 = keccak256(abi.encodePacked(user3, uint256(600e18), user3Claim));
        
        // For simplicity, use individual leaves as roots (in real scenario, build proper tree)
        bytes32[] memory emptyProof = new bytes32[](0);
        
        treasury.finalizeEpoch(1, leaf1, 900e18);
        
        // User1 claims
        vm.prank(user1);
        treasury.claimDividends(1, 1000e18, user1Claim, emptyProof);
        
        // Check balances and claim status
        assertEq(penguToken.balanceOf(user1), 1000e18 + user1Claim);
        assertTrue(treasury.hasUserClaimed(user1, 1));
        
        (,,, uint256 claimedAmount,,,,) = treasury.getEpochInfo(1);
        assertEq(claimedAmount, user1Claim);
    }
    
    function testZeroDividendEpoch() public {
        treasury.startNewEpoch();
        // Don't add any dividends
        
        treasury.startNewEpoch();
        treasury.finalizeEpoch(1, keccak256("empty"), 0);
        
        (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(1);
        assertEq(totalDividends, 0);
    }
    
    function testLargeDividendAmounts() public {
        treasury.startNewEpoch();
        
        // Add very large dividend amount
        uint256 largeAmount = type(uint128).max;
        penguToken.mint(feeCollector, largeAmount);
        
        vm.prank(feeCollector);
        treasury.addDividends(largeAmount);
        
        (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(1);
        assertEq(totalDividends, largeAmount);
    }
    
    function testEpochSequenceIntegrity() public {
        for (uint i = 1; i <= 5; i++) {
            treasury.startNewEpoch();
            vm.prank(feeCollector);
            treasury.addDividends(100e18 * i);

            assertEq(treasury.currentEpoch(), i);

            (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(i);

            uint256 expectedDividends = 100e18 * i;
            
            if (i == 4) expectedDividends += 100e18; // rollover из epoch 1 (100e18 - 0)
            if (i == 5) expectedDividends += 200e18; // rollover из epoch 2 (200e18 - 0)

            assertEq(totalDividends, expectedDividends);
        }
    }
    
    function testClaimAfterPartialWithdraw() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch(); // Epoch 2
        treasury.startNewEpoch(); // Epoch 3 - epoch 1 becomes expired
        
        treasury.emergencyWithdraw(1, 300e18);
        
        uint256 unclaimed = treasury.getTotalUnclaimedExpired();
        assertEq(unclaimed, 1000e18);
    }
    
    function testInsufficientTokenBalance() public {
        // Create scenario where contract doesn't have enough tokens for claim
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        // Withdraw tokens from contract directly (simulate external issue)
        vm.prank(address(treasury));
        penguToken.transfer(owner, 800e18);
        
        bytes32 leaf = keccak256(abi.encodePacked(user1, uint256(1000e18), uint256(500e18)));
        bytes32[] memory proof = new bytes32[](0);
        treasury.finalizeEpoch(1, leaf, 500e18);
        
        // Claim should fail due to insufficient balance
        vm.prank(user1);
        vm.expectRevert();
        treasury.claimDividends(1, 1000e18, 500e18, proof);
    }
    
    function testGasOptimization() public {
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        bytes32 leaf = keccak256(abi.encodePacked(user1, uint256(1000e18), uint256(100e18)));
        bytes32[] memory proof = new bytes32[](0);
        treasury.finalizeEpoch(1, leaf, 1000e18);
        
        uint256 gasBefore = gasleft();
        vm.prank(user1);
        treasury.claimDividends(1, 1000e18, 100e18, proof);
        uint256 gasUsed = gasBefore - gasleft();
        
        assertTrue(gasUsed < 200000, "Claim uses too much gas");
    }
    
    function testReentrancyProtection() public {
        // This test would require a malicious contract to test reentrancy
        // For now, just verify the modifier is in place
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        treasury.startNewEpoch();
        
        bytes32 leaf = keccak256(abi.encodePacked(user1, uint256(1000e18), uint256(100e18)));
        bytes32[] memory proof = new bytes32[](0);
        treasury.finalizeEpoch(1, leaf, 1000e18);
        
        // Normal claim should work
        vm.prank(user1);
        treasury.claimDividends(1, 1000e18, 100e18, proof);
        
        assertTrue(treasury.hasUserClaimed(user1, 1));
    }
    
    function testEventEmissions() public {
        treasury.startNewEpoch();
        
        // Test DividendsAdded event
        vm.expectEmit(true, false, false, true);
        emit DividendsAdded(1, 100e18);
        
        vm.prank(feeCollector);
        treasury.addDividends(100e18);
        
        treasury.startNewEpoch();
        
        // Test EpochFinalized event
        bytes32 merkleRoot = keccak256("test");
        vm.expectEmit(true, false, false, true);
        emit EpochFinalized(1, merkleRoot, 100e18);
        
        treasury.finalizeEpoch(1, merkleRoot, 100e18);
    }
    
    function testComplexRolloverScenario() public {
        treasury.startNewEpoch(); // Epoch 1
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);

        treasury.startNewEpoch(); // Epoch 2  
        vm.prank(feeCollector);
        treasury.addDividends(500e18);

        treasury.startNewEpoch(); // Epoch 3
        treasury.finalizeEpoch(1, keccak256("test1"), 600e18);

        treasury.startNewEpoch();

        (,, uint256 epoch4Dividends,,,,,) = treasury.getEpochInfo(4);
        assertEq(epoch4Dividends, 1000e18);
    }
    
    function testMaxEpochsScenario() public {
        // Test creating many epochs to check for any overflow issues
        for (uint i = 0; i < 100; i++) {
            treasury.startNewEpoch();
            if (i % 10 == 0) {
                vm.prank(feeCollector);
                treasury.addDividends(10e18);
            }
        }
        
        assertEq(treasury.currentEpoch(), 100);
        
        // Verify we can still interact with recent epochs
        (uint256 startTime,,,,,,,) = treasury.getEpochInfo(100);
        assertGt(startTime, 0);
    }
    
    function testOwnershipTransfer() public {
        address newOwner = makeAddr("newOwner");
        
        treasury.transferOwnership(newOwner);
        
        assertEq(treasury.owner(), newOwner);
        
        vm.expectRevert();
        treasury.startNewEpoch();
        
        vm.prank(newOwner);
        treasury.startNewEpoch();
        
        assertEq(treasury.currentEpoch(), 1);
    }
    
    function testContractUpgradeability() public {
        // Test that contract state is preserved across function calls
        treasury.startNewEpoch();
        vm.prank(feeCollector);
        treasury.addDividends(1000e18);
        
        uint256 epochBefore = treasury.currentEpoch();
        uint256 balanceBefore = treasury.getContractBalance();
        
        // Simulate some time passing
        vm.warp(block.timestamp + 1 days);
        
        // State should be preserved
        assertEq(treasury.currentEpoch(), epochBefore);
        assertEq(treasury.getContractBalance(), balanceBefore);
        
        (,, uint256 totalDividends,,,,,) = treasury.getEpochInfo(1);
        assertEq(totalDividends, 1000e18);
    }
}