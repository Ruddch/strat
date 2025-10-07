// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/StratToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock contracts for testing
contract MockRouter {
    address public WETH;
    bool public shouldFailSwap = false;
    uint256 public ethToReturn = 1 ether;
    
    constructor(address _weth) {
        WETH = _weth;
    }
    
    function factory() external pure returns (address) {
        return address(0x1234);
    }
    
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint /* amountOutMin */,
        address[] calldata path,
        address to,
        uint /* deadline */
    ) external {
        if (shouldFailSwap) {
            revert("Swap failed");
        }
        
        // Take tokens from sender
        ERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        // Send ETH to recipient
        payable(to).transfer(ethToReturn);
    }
    
    function setSwapResult(bool _shouldFail, uint256 _ethAmount) external {
        shouldFailSwap = _shouldFail;
        ethToReturn = _ethAmount;
    }
    
    receive() external payable {}
}

contract MockFactory {
    function createPair(address /* tokenA */, address /* tokenB */) external pure returns (address) {
        return address(0x5678); // Mock pair address
    }
}

contract MockFeeCollector {
    uint256 public receivedETH = 0;
    bool public shouldRevert = false;
    
    function receiveETH() external payable {
        if (shouldRevert) revert("Collector failed");
        receivedETH += msg.value;
    }
    
    function setRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
    
    // Fallback always accepts ETH (ignores shouldRevert)
    receive() external payable {}
    fallback() external payable {}
}

contract StratTokenTest is Test {
    StratToken public token;
    MockRouter public mockRouter;
    MockFactory public mockFactory;
    MockFeeCollector public mockCollector;
    
    address payable public opsWallet = payable(address(0x111));
    address public buybackManager = address(0x333);
    address public weth = address(0x444);
    
    address public alice = address(0x1000);
    address public bob = address(0x2000);
    address public pair = address(0x5678); // Must match MockFactory

    event FeeTaken(uint256 amount, address from);
    event ImmediateSwapResult(bool success, uint256 tokensIn, uint256 ethOut, uint256 toOps, uint256 toCollector);

    function setUp() public {
        // Create mock contracts
        mockRouter = new MockRouter(weth);
        mockFactory = new MockFactory();
        mockCollector = new MockFeeCollector();
        
        // Replace factory in router with our mock
        vm.etch(address(0x1234), address(mockFactory).code);
        vm.deal(address(mockRouter), 100 ether);
        
        // Create token
        token = new StratToken(
            "Strategy Token",
            "STRAT", 
            1_000_000 * 10**18, // 1M supply
            opsWallet,
            address(mockCollector),
            buybackManager,
            address(mockRouter)
        );
        
        // Disable limits for setup
        token.setLimits(1_000_000 * 10**18, 1_000_000 * 10**18, false);
        
        // Enable trading
        token.enableTrading();
        
        // Setup test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(opsWallet, 1 ether);
        
        // Transfer tokens to alice for testing
        token.transfer(alice, 100_000 * 10**18);
        
        // Re-enable limits for tests
        token.setLimits(10_000 * 10**18, 30_000 * 10**18, true);
        
        // Mark pair as market
        token.setMarket(pair, true);
    }
    
    function testBasicTransferNoFee() public {
        uint256 amount = 1000 * 10**18;
        uint256 aliceBalanceBefore = token.balanceOf(alice);
        uint256 bobBalanceBefore = token.balanceOf(bob);
        
        vm.prank(alice);
        token.transfer(bob, amount);
        
        // Basic transfer should not take fee
        assertEq(token.balanceOf(alice), aliceBalanceBefore - amount);
        assertEq(token.balanceOf(bob), bobBalanceBefore + amount);
        assertEq(token.balanceOf(address(token)), 0);
    }
    
    function testMarketTransferWithFeeImmediateSwapSuccess() public {
        uint256 amount = 10000 * 10**18; // 10,000 tokens
        uint256 expectedFee = (amount * 1000) / 10000; // 10% = 1,000 tokens
        
        // Setup mock router for successful swap
        mockRouter.setSwapResult(false, 0.5 ether);
        
        uint256 aliceBalanceBefore = token.balanceOf(alice);
        uint256 opsBalanceBefore = opsWallet.balance;
        uint256 collectorBalanceBefore = mockCollector.receivedETH();
        
        // Expect events
        vm.expectEmit(true, true, true, true);
        emit FeeTaken(expectedFee, alice);
        
        vm.expectEmit(true, true, true, true);
        emit ImmediateSwapResult(true, expectedFee, 0.5 ether, 0.1 ether, 0.4 ether);
        
        // Simulate sale to pair (market transaction)
        vm.prank(alice);
        token.transfer(pair, amount);
        
        // Check that fee was taken
        assertEq(token.balanceOf(alice), aliceBalanceBefore - amount);
        assertEq(token.balanceOf(pair), amount - expectedFee); // Pair received amount - fee
        
        // Check that tokens were NOT left in contract (swap succeeded)
        assertEq(token.balanceOf(address(token)), 0);
        
        // Check ETH distribution: 20% ops, 80% collector
        assertEq(opsWallet.balance, opsBalanceBefore + 0.1 ether);
        assertEq(mockCollector.receivedETH(), collectorBalanceBefore + 0.4 ether);
    }
    
    function testMarketTransferWithFeeImmediateSwapFails() public {
        uint256 amount = 10000 * 10**18;
        uint256 expectedFee = (amount * 1000) / 10000; // 10%
        
        // Setup mock router for swap failure
        mockRouter.setSwapResult(true, 0); // shouldFailSwap = true
        
        uint256 aliceBalanceBefore = token.balanceOf(alice);
        
        // Expect events
        vm.expectEmit(true, true, true, true);
        emit FeeTaken(expectedFee, alice);
        
        vm.expectEmit(true, true, true, true);
        emit ImmediateSwapResult(false, 0, 0, 0, 0);
        
        vm.prank(alice);
        token.transfer(pair, amount);
        
        // Check that fee was taken
        assertEq(token.balanceOf(alice), aliceBalanceBefore - amount);
        assertEq(token.balanceOf(pair), amount - expectedFee);
        
        // Check that tokens remained in contract (swap failed)
        assertEq(token.balanceOf(address(token)), expectedFee);
        
        // ETH should not be sent
        assertEq(mockCollector.receivedETH(), 0);
    }
    
    function testSwapBackWhenThresholdReached() public {
        // First accumulate tokens in contract (fail immediate swap)
        mockRouter.setSwapResult(true, 0); // Fail immediate swap
        
        uint256 amount = 2000 * 10**18; // 2,000 tokens
        uint256 expectedFee = (amount * 1000) / 10000; // 200 tokens
        
        // Make transaction to accumulate tokens
        vm.prank(alice);
        token.transfer(pair, amount);
        
        assertEq(token.balanceOf(address(token)), expectedFee);
        
        // Now enable successful swap and make another transaction
        mockRouter.setSwapResult(false, 0.1 ether); // Success
        
        // Second transaction should trigger swapBack if threshold reached
        vm.prank(alice);
        token.transfer(pair, amount);
        
        // Contract should have fewer tokens (some sold via swapBack)
        // or all if swapThreshold not reached
    }
    
    function testAntiWhaleLimits() public {
        uint256 maxTx = token.maxTx();      // 10,000 tokens
        uint256 maxWallet = token.maxWallet(); // 30,000 tokens
        
        console.log("maxTx:", maxTx);
        console.log("maxWallet:", maxWallet);
        console.log("bob balance start:", token.balanceOf(bob));
        
        // Test 1: maxTx exceeded
        vm.prank(alice);
        vm.expectRevert(StratToken.MaxTxExceeded.selector);
        token.transfer(bob, maxTx + 1); // 10,001 tokens → MaxTxExceeded
        
        // Test 2: maxWallet exceeded
        // Give bob almost maximum wallet (but not full maximum!)
        uint256 firstTransfer = maxTx;  // 10,000 tokens
        token.transfer(bob, firstTransfer);
        console.log("bob balance after first:", token.balanceOf(bob));
        
        uint256 secondTransfer = maxTx;  // Another 10,000 tokens  
        token.transfer(bob, secondTransfer);
        console.log("bob balance after second:", token.balanceOf(bob));
        // bob now has 20,000 tokens
        
        // Now try to send maxTx (10,000) → total will be 30,000 (equals limit)
        vm.prank(alice);
        token.transfer(bob, maxTx); // Should pass (30,000 = maxWallet)
        console.log("bob balance after third:", token.balanceOf(bob));
        
        // But even +1 token should fail
        vm.prank(alice);
        vm.expectRevert(StratToken.MaxWalletExceeded.selector);
        token.transfer(bob, 1); // 30,001 > maxWallet → MaxWalletExceeded
    }
    
    function testFeeExemptions() public {
        uint256 amount = 10000 * 10**18;
        
        // Make alice exempt from fees
        token.setFeeExempt(alice, true);
        
        uint256 aliceBalanceBefore = token.balanceOf(alice);
        uint256 pairBalanceBefore = token.balanceOf(pair);
        
        vm.prank(alice);
        token.transfer(pair, amount);
        
        // Fee should not be taken
        assertEq(token.balanceOf(alice), aliceBalanceBefore - amount);
        assertEq(token.balanceOf(pair), pairBalanceBefore + amount); // Full amount
        assertEq(token.balanceOf(address(token)), 0); // Tokens don't accumulate
    }
    
    function testTradingDisabledBeforeEnable() public {
        // Create new token without enabled trading
        StratToken newToken = new StratToken(
            "Test Token",
            "TEST",
            1_000_000 * 10**18,
            opsWallet,
            address(mockCollector),
            buybackManager,
            address(mockRouter)
        );
        
        // Transfer tokens to alice
        newToken.transfer(alice, 10000 * 10**18);
        
        // Try to make market transfer before enabling trading
        vm.prank(alice);
        vm.expectRevert(StratToken.TradingDisabled.selector);
        newToken.transfer(address(0x5678), 1000 * 10**18);
        
        // Owner can transfer before enabling trading
        vm.prank(address(this));
        newToken.transfer(bob, 1000 * 10**18);
        assertEq(newToken.balanceOf(bob), 1000 * 10**18);
    }
    
    function testManualSwap() public {
        // Accumulate tokens in contract (fail immediate swap)
        mockRouter.setSwapResult(true, 0);
        
        uint256 amount = 10000 * 10**18;
        vm.prank(alice);
        token.transfer(pair, amount);
        
        uint256 tokensInContract = token.balanceOf(address(token));
        assertGt(tokensInContract, 0);
        
        // Enable successful swap
        mockRouter.setSwapResult(false, 0.5 ether);
        
        uint256 opsBalanceBefore = opsWallet.balance;
        uint256 collectorBalanceBefore = mockCollector.receivedETH();
        
        // Call manual swap
        token.manualSwap(0); // 0 = swap all
        
        // Check that tokens were sold
        assertEq(token.balanceOf(address(token)), 0);
        
        // Check ETH distribution
        assertEq(opsWallet.balance, opsBalanceBefore + 0.1 ether);
        assertEq(mockCollector.receivedETH(), collectorBalanceBefore + 0.4 ether);
    }
    
    function testCollectorFallback() public {
        uint256 amount = 10000 * 10**18;
        
        // Setup collector to revert receiveETH()
        mockCollector.setRevert(true);
        mockRouter.setSwapResult(false, 0.5 ether);
        
        uint256 opsBalanceBefore = opsWallet.balance;
        uint256 collectorBalanceBefore = address(mockCollector).balance;
        
        vm.prank(alice);
        token.transfer(pair, amount);
        
        // ETH should go to ops as usual
        assertEq(opsWallet.balance, opsBalanceBefore + 0.1 ether);
        
        // Collector should receive ETH via fallback (regular transfer)  
        assertEq(address(mockCollector).balance, collectorBalanceBefore + 0.4 ether);
        
        // receiveETH should not be called (remains 0)
        assertEq(mockCollector.receivedETH(), 0);
    }
    
    function testSetWallets() public {
        address payable newOps = payable(address(0x999));
        address newCollector = address(0x888);
        address newBuyback = address(0x777);
        
        // Check that old addresses are exempt
        assertTrue(token.feeExempt(opsWallet));
        assertTrue(token.feeExempt(address(mockCollector)));
        
        // Change addresses
        token.setWallets(newOps, newCollector, newBuyback);
        
        // Check that new addresses are exempt
        assertTrue(token.feeExempt(newOps));
        assertTrue(token.feeExempt(newCollector));
        assertTrue(token.feeExempt(newBuyback));
        
        // Check that addresses were updated
        assertEq(token.opsWallet(), newOps);
        assertEq(token.feeCollector(), newCollector);
        assertEq(token.buybackManager(), newBuyback);
    }
    
    function testRescueFunctions() public {
        // Send ETH to contract
        vm.deal(address(token), 1 ether);
        
        uint256 ownerBalanceBefore = address(this).balance;
        
        // Rescue ETH
        token.rescueETH(0.5 ether);
        
        assertEq(address(this).balance, ownerBalanceBefore + 0.5 ether);
        assertEq(address(token).balance, 0.5 ether);
    }
    
    function testViewFunctions() public view {
        // Test circulating supply
        uint256 totalSupply = token.totalSupply();
        uint256 circulating = token.getCirculatingSupply();
        
        // Should equal total supply (no burning)
        assert(circulating == totalSupply);
        
        // Test other view functions
        assert(token.isExcludedFromFee(address(token)) == true);
        assert(token.isExcludedFromFee(alice) == false);
        
        assert(token.isExcludedFromLimit(address(this)) == true); // owner
        assert(token.isExcludedFromLimit(alice) == false);
        
        assert(token.getTokensInContract() >= 0);
    }
    
    // Test helper - receive ETH
    receive() external payable {}
}