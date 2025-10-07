// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/BuybackManager.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IBuybackManager {
    function receiveFromStrategy(address caller) external payable;
}

// ==================== MOCK CONTRACTS ====================

// Mock burnable STRAT token
contract MockSTRAT is IERC20 {
    string public name = "Strategy Token";
    string public symbol = "STRAT";
    uint8 public decimals = 18;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    
    bool public shouldRevertTransfer = false;
    bool public shouldRevertBurn = false;
    uint256 public burnCallCount = 0;
    uint256 public totalBurned = 0;
    
    constructor() {
        _totalSupply = 1000000e18;
        _balances[msg.sender] = _totalSupply;
    }
    
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address to, uint256 amount) external override returns (bool) {
        if (shouldRevertTransfer) revert("Transfer failed");
        return _transfer(msg.sender, to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        if (shouldRevertTransfer) revert("Transfer failed");
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "Insufficient allowance");
        _allowances[from][msg.sender] = currentAllowance - amount;
        return _transfer(from, to, amount);
    }
    
    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        return true;
    }
    
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function burn(uint256 amount) external {
        if (shouldRevertBurn) revert("Burn failed");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _totalSupply -= amount;
        burnCallCount++;
        totalBurned += amount;
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(_balances[from] >= amount, "Insufficient balance");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function setShouldRevertTransfer(bool shouldRevert) external {
        shouldRevertTransfer = shouldRevert;
    }
    
    function setShouldRevertBurn(bool shouldRevert) external {
        shouldRevertBurn = shouldRevert;
    }
    
    function resetCounters() external {
        burnCallCount = 0;
        totalBurned = 0;
    }
}

// Mock Uniswap Router
contract MockUniswapRouter is IUniswapV2Router02 {
    address public immutable override WETH;
    
    mapping(address => uint256) public tokenPrices; // Price in ETH
    bool public shouldRevertSwap = false;
    uint256 public swapCallCount = 0;
    uint256 public lastSwapETHAmount = 0;
    address public lastSwapRecipient;
    bool public simulateFeeOnTransfer = false;
    uint256 public feePercent = 0; // in bps
    
    event SwapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] path,
        address to,
        uint deadline
    );
    
    constructor(address _weth) {
        WETH = _weth;
    }
    
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override {
        if (shouldRevertSwap) revert("Swap failed");
        require(path.length == 2, "Invalid path");
        require(path[0] == WETH, "Invalid path start");
        require(deadline >= block.timestamp, "Deadline passed");
        
        swapCallCount++;
        lastSwapETHAmount = msg.value;
        lastSwapRecipient = to;
        
        address tokenOut = path[1];
        uint256 tokenPrice = tokenPrices[tokenOut];
        require(tokenPrice > 0, "Price not set");
        
        // Calculate tokens to send
        uint256 tokensOut = (msg.value * 1e18) / tokenPrice;
        
        // Apply fee-on-transfer if enabled
        if (simulateFeeOnTransfer && feePercent > 0) {
            tokensOut = tokensOut - (tokensOut * feePercent / 10000);
        }
        
        require(tokensOut >= amountOutMin, "Insufficient output amount");
        
        // Transfer tokens to recipient
        MockSTRAT(tokenOut).mint(to, tokensOut);
        
        emit SwapExactETHForTokensSupportingFeeOnTransferTokens(
            amountOutMin,
            path,
            to,
            deadline
        );
    }
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external
        view
        override
        returns (uint[] memory amounts)
    {
        require(path.length == 2, "Invalid path");
        amounts = new uint[](2);
        amounts[0] = amountIn;
        
        if (path[0] == WETH && tokenPrices[path[1]] > 0) {
            amounts[1] = (amountIn * 1e18) / tokenPrices[path[1]];
        } else {
            amounts[1] = 0;
        }
    }
    
    function setTokenPrice(address token, uint256 priceInETH) external {
        tokenPrices[token] = priceInETH;
    }
    
    function setShouldRevertSwap(bool shouldRevert) external {
        shouldRevertSwap = shouldRevert;
    }
    
    function setFeeOnTransfer(bool enabled, uint256 feeBps) external {
        simulateFeeOnTransfer = enabled;
        feePercent = feeBps;
    }
    
    function resetCounters() external {
        swapCallCount = 0;
        lastSwapETHAmount = 0;
        lastSwapRecipient = address(0);
    }
}

// Mock StrategyCore
contract MockStrategyCore {
    address public buybackManager;
    bool public shouldRevertSend = false;
    constructor(address _buybackManager) {
        buybackManager = _buybackManager;
    }
    
    function setBuybackManager(address _buybackManager) external {
        buybackManager = _buybackManager;
    }
    function sendETHToBuyback(uint256 amount, address caller) external {
        if (shouldRevertSend) revert("Send failed");
        BuybackManager(payable(buybackManager)).receiveFromStrategy{value: amount}(caller);
    }
    function setShouldRevertSend(bool shouldRevert) external {
        shouldRevertSend = shouldRevert;
    }
    receive() external payable {}
}

// ==================== TEST CONTRACT ====================

contract BuybackManagerTest is Test {
    BuybackManager public buyback;
    MockSTRAT public stratToken;
    MockUniswapRouter public router;
    MockStrategyCore public strategyCore;
    
    address public owner = address(0x1);
    address public user = address(0x2);
    address public keeper = address(0x3);
    address public weth = address(0x4);
    
    // Test constants
    uint256 constant DEFAULT_THRESHOLD = 0.01 ether;
    uint256 constant DEFAULT_SLIPPAGE = 300; // 3%
    uint256 constant DEFAULT_CALLER_REWARD = 50; // 0.5%
    uint256 constant STRAT_PRICE_IN_ETH = 0.001 ether; // 1 STRAT = 0.001 ETH
    
    // Events from BuybackManager
    event ETHReceived(address indexed from, uint256 amount, uint256 newPendingTotal, uint256 timestamp);
    event BuybackExecuted(address indexed caller, uint256 ethUsed, uint256 stratReceived, uint256 stratBurned, uint256 callerReward, uint256 timestamp);
    event BuybackThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event SlippageUpdated(uint256 oldSlippage, uint256 newSlippage);
    event CallerRewardUpdated(uint256 oldReward, uint256 newReward);
    event AutoBuybackToggled(bool enabled);
    event RouterUpdated(address oldRouter, address newRouter);
    event BuybackFailed(string reason, uint256 ethAmount, address caller, uint256 timestamp);
    
    function setUp() public {
        // Deploy mock contracts
        stratToken = new MockSTRAT();
        router = new MockUniswapRouter(weth);
        
        strategyCore = new MockStrategyCore(address(0x1));
        
        vm.prank(owner);
        buyback = new BuybackManager(
            address(stratToken),
            address(strategyCore),
            address(router),
            owner
        );
        
        strategyCore.setBuybackManager(address(buyback));
        
        // Setup prices and balances
        router.setTokenPrice(address(stratToken), STRAT_PRICE_IN_ETH);
        vm.deal(address(this), 100 ether);
        vm.deal(address(strategyCore), 50 ether);
        vm.deal(keeper, 10 ether);
        vm.deal(user, 10 ether);
        
        // Give strategy core some tokens for testing
        stratToken.mint(address(strategyCore), 1000000e18);
    }
    
    // ==================== INITIALIZATION TESTS ====================
    
    function testDeployment() public {
        assertEq(buyback.stratTokenAddress(), address(stratToken));
        assertEq(buyback.strategyCore(), address(strategyCore));  
        assertEq(address(buyback.router()), address(router));
        assertEq(buyback.owner(), owner);
        assertEq(buyback.buybackThreshold(), DEFAULT_THRESHOLD);
        assertEq(buyback.slippageBps(), DEFAULT_SLIPPAGE);
        assertEq(buyback.callerRewardBps(), DEFAULT_CALLER_REWARD);
        assertEq(buyback.autoBuybackEnabled(), true);
        assertEq(buyback.paused(), false);
    }
    
    function testDeploymentWithZeroAddresses() public {
        // Owner = address(0)
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new BuybackManager(address(stratToken), address(strategyCore), address(router), address(0));
        
        vm.expectRevert(BuybackManager.ZeroAddress.selector);
        new BuybackManager(address(0), address(strategyCore), address(router), owner);
        
        // strategyCore = address(0)
        vm.expectRevert(BuybackManager.ZeroAddress.selector);
        new BuybackManager(address(stratToken), address(0), address(router), owner);
        
        // router = address(0)
        vm.expectRevert(BuybackManager.ZeroAddress.selector);
        new BuybackManager(address(stratToken), address(strategyCore), address(0), owner);
    }
    
    // ==================== ETH RECEIVING TESTS ====================
    
    function testReceiveETHFromStrategyCore() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        uint256 ethAmount = 0.05 ether;
        
        vm.expectEmit(true, true, false, true);
        emit ETHReceived(address(strategyCore), ethAmount, ethAmount, block.timestamp);
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        assertEq(buyback.pendingETH(), ethAmount);
        assertEq(buyback.totalETHReceived(), ethAmount);
        assertEq(address(buyback).balance, ethAmount);
    }
    
    function testReceiveETHFromUnauthorized() public {
        vm.expectRevert(abi.encodeWithSelector(BuybackManager.UnauthorizedCaller.selector, user));
        
        vm.prank(user);
        buyback.receiveFromStrategy{value: 1 ether}(keeper);
    }
    
    function testReceiveZeroETH() public {
        vm.expectRevert(BuybackManager.ZeroAmount.selector);
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: 0}(keeper);
    }
    
    function testReceiveETHWhenPaused() public {
        vm.prank(owner);
        buyback.pause();
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: 1 ether}(keeper);
    }
    // ==================== AUTOMATIC BUYBACK TESTS ====================
    
    function testAutomaticBuybackOnReceive() public {
        uint256 ethAmount = 0.02 ether; // Above threshold
        
        // Expect buyback execution events
        vm.expectEmit(true, true, false, true);
        emit ETHReceived(address(strategyCore), ethAmount, ethAmount, block.timestamp);
        
        vm.expectEmit(true, false, false, false);
        emit BuybackExecuted(keeper, 0, 0, 0, 0, block.timestamp);
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        // Check that buyback was executed
        assertEq(buyback.pendingETH(), 0);
        assertGt(buyback.totalETHUsedForBuyback(), 0);
        assertGt(buyback.totalSTRATBurned(), 0);
        assertEq(buyback.totalBuybacks(), 1);
    }
    
    function testNoAutomaticBuybackBelowThreshold() public {
        uint256 ethAmount = 0.005 ether; // Below threshold
        
        vm.expectEmit(true, true, false, true);
        emit ETHReceived(address(strategyCore), ethAmount, ethAmount, block.timestamp);
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        // Should not trigger buyback
        assertEq(buyback.pendingETH(), ethAmount);
        assertEq(buyback.totalETHUsedForBuyback(), 0);
        assertEq(buyback.totalBuybacks(), 0);
    }
    
    function testAutomaticBuybackDisabled() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        uint256 ethAmount = 0.02 ether;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        // Should not trigger buyback
        assertEq(buyback.pendingETH(), ethAmount);
        assertEq(buyback.totalBuybacks(), 0);
    }
    
    // ==================== MANUAL BUYBACK TESTS ====================
    
    function testManualBuybackTrigger() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        uint256 ethAmount = 0.02 ether;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        assertEq(buyback.pendingETH(), ethAmount);
        assertEq(buyback.totalBuybacks(), 0);
        
        vm.expectEmit(true, false, false, false);
        emit BuybackExecuted(user, 0, 0, 0, 0, block.timestamp);
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertEq(buyback.pendingETH(), 0);
        assertEq(buyback.totalBuybacks(), 1);
    }
    
    function testManualBuybackBelowThreshold() public {
        uint256 ethAmount = 0.005 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        vm.expectRevert(abi.encodeWithSelector(BuybackManager.InsufficientETH.selector, ethAmount, DEFAULT_THRESHOLD));
        
        vm.prank(user);
        buyback.triggerBuyback();
    }
    
    function testManualBuybackWhenPaused() public {
        uint256 ethAmount = 0.02 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        vm.prank(owner);
        buyback.pause();
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        vm.prank(user);
        buyback.triggerBuyback();
    }
    
    // ==================== BUYBACK FAILURE TESTS ====================
    
    function testBuybackSwapFailure() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        router.setShouldRevertSwap(true);
        
        uint256 ethAmount = 0.02 ether;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        vm.expectEmit(true, false, false, false);
        emit BuybackFailed("Swap failed", ethAmount - (ethAmount * DEFAULT_CALLER_REWARD / 10000), user, block.timestamp);
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertGt(buyback.pendingETH(), 0);
        assertEq(buyback.totalBuybacks(), 0);
    }
    
    function testBuybackBurnFailure() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        stratToken.setShouldRevertBurn(true);
        stratToken.setShouldRevertTransfer(false);
        
        uint256 ethAmount = 0.02 ether;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        vm.expectEmit(true, false, false, false);
        emit BuybackExecuted(user, 0, 0, 0, 0, block.timestamp);
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertEq(buyback.pendingETH(), 0);
        assertEq(buyback.totalBuybacks(), 1);
        assertGt(stratToken.balanceOf(address(0xdead)), 0);
    }
    
    //function testBuybackSlippageProtection() public {
    //}
    
    // ==================== CALLER REWARD TESTS ====================
    
    function testCallerRewardDistribution() public {
        uint256 ethAmount = 0.02 ether;
        uint256 expectedReward = (ethAmount * DEFAULT_CALLER_REWARD) / 10000;
        uint256 keeperBalanceBefore = keeper.balance;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        assertEq(keeper.balance, keeperBalanceBefore + expectedReward);
        assertEq(buyback.totalCallerRewards(), expectedReward);
    }
    
    function testCallerRewardFailedTransfer() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        uint256 ethAmount = 0.02 ether;
        
        // Create a contract that rejects ETH
        RejectETH rejecter = new RejectETH();
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(address(rejecter));
        
        uint256 pendingBefore = buyback.pendingETH();
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertEq(buyback.pendingETH(), 0);
        assertEq(buyback.totalBuybacks(), 1);
        
    }
    
    function testZeroCallerReward() public {
        vm.prank(owner);
        buyback.setCallerReward(0);
        
        uint256 ethAmount = 0.02 ether;
        uint256 keeperBalanceBefore = keeper.balance;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        assertEq(keeper.balance, keeperBalanceBefore);
        assertEq(buyback.totalCallerRewards(), 0);
    }
    
    // ==================== CONFIGURATION TESTS ====================
    
    function testSetBuybackThreshold() public {
        uint256 newThreshold = 0.05 ether;
        
        vm.expectEmit(true, true, false, false);
        emit BuybackThresholdUpdated(DEFAULT_THRESHOLD, newThreshold);
        
        vm.prank(owner);
        buyback.setBuybackThreshold(newThreshold);
        
        assertEq(buyback.buybackThreshold(), newThreshold);
    }
    
    function testSetBuybackThresholdTooLow() public {
        uint256 tooLow = 0.0001 ether;
        
        vm.expectRevert(abi.encodeWithSelector(
            BuybackManager.ThresholdOutOfBounds.selector,
            tooLow,
            buyback.MIN_BUYBACK_THRESHOLD(),
            buyback.MAX_BUYBACK_THRESHOLD()
        ));
        
        vm.prank(owner);
        buyback.setBuybackThreshold(tooLow);
    }
    
    function testSetBuybackThresholdTooHigh() public {
        uint256 tooHigh = 1000 ether;
        
        vm.expectRevert(abi.encodeWithSelector(
            BuybackManager.ThresholdOutOfBounds.selector,
            tooHigh,
            buyback.MIN_BUYBACK_THRESHOLD(),
            buyback.MAX_BUYBACK_THRESHOLD()
        ));
        
        vm.prank(owner);
        buyback.setBuybackThreshold(tooHigh);
    }
    
    function testSetSlippage() public {
        uint256 newSlippage = 500; // 5%
        
        vm.expectEmit(true, true, false, false);
        emit SlippageUpdated(DEFAULT_SLIPPAGE, newSlippage);
        
        vm.prank(owner);
        buyback.setSlippage(newSlippage);
        
        assertEq(buyback.slippageBps(), newSlippage);
    }
    
    function testSetSlippageTooHigh() public {
        uint256 tooHigh = 1000; // 10%
        
        vm.expectRevert(abi.encodeWithSelector(
            BuybackManager.SlippageTooHigh.selector,
            tooHigh,
            buyback.MAX_SLIPPAGE_BPS()
        ));
        
        vm.prank(owner);
        buyback.setSlippage(tooHigh);
    }
    
    function testSetCallerReward() public {
        uint256 newReward = 100; // 1%
        
        vm.expectEmit(true, true, false, false);
        emit CallerRewardUpdated(DEFAULT_CALLER_REWARD, newReward);
        
        vm.prank(owner);
        buyback.setCallerReward(newReward);
        
        assertEq(buyback.callerRewardBps(), newReward);
    }
    
    function testSetCallerRewardTooHigh() public {
        uint256 tooHigh = 200; // 2%
        
        vm.expectRevert(abi.encodeWithSelector(
            BuybackManager.CallerRewardTooHigh.selector,
            tooHigh,
            buyback.MAX_CALLER_REWARD_BPS()
        ));
        
        vm.prank(owner);
        buyback.setCallerReward(tooHigh);
    }
    
    function testSetAutoBuyback() public {
        vm.expectEmit(true, false, false, false);
        emit AutoBuybackToggled(false);
        
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        assertFalse(buyback.autoBuybackEnabled());
    }
    
    function testSetRouter() public {
        MockUniswapRouter newRouter = new MockUniswapRouter(weth);
        
        vm.expectEmit(true, true, false, false);
        emit RouterUpdated(address(router), address(newRouter));
        
        vm.prank(owner);
        buyback.setRouter(address(newRouter));
        
        assertEq(address(buyback.router()), address(newRouter));
    }
    
    function testSetRouterZeroAddress() public {
        vm.expectRevert(BuybackManager.ZeroAddress.selector);
        
        vm.prank(owner);
        buyback.setRouter(address(0));
    }
    
    // ==================== ACCESS CONTROL TESTS ====================
    
    function testOnlyOwnerFunctions() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        buyback.setBuybackThreshold(0.05 ether);
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        buyback.setSlippage(400);
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        buyback.setCallerReward(75);
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        buyback.setAutoBuyback(false);
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        buyback.pause();
        
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        buyback.emergencyWithdrawETH(0);
    }
    
    // ==================== PAUSE/UNPAUSE TESTS ====================
    
    function testPauseUnpause() public {
        assertFalse(buyback.paused());
        
        vm.prank(owner);
        buyback.pause();
        assertTrue(buyback.paused());
        
        vm.prank(owner);
        buyback.unpause();
        assertFalse(buyback.paused());
    }
    
    function testPausedOperations() public {
        vm.prank(owner);
        buyback.pause();
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: 1 ether}(keeper);
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        vm.prank(user);
        buyback.triggerBuyback();
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        vm.prank(owner);
        buyback.forceExecuteBuyback();
    }
    
    // ==================== EMERGENCY FUNCTIONS TESTS ====================
    
    function testEmergencyWithdrawETH() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        uint256 ethAmount = 0.02 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        buyback.emergencyWithdrawETH(ethAmount);
        
        assertEq(owner.balance, ownerBalanceBefore + ethAmount);
        assertEq(buyback.pendingETH(), 0);
    }

    function testEmergencyWithdrawETHAll() public {
        uint256 ethAmount = 0.02 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        uint256 ownerBalanceBefore = owner.balance;
        uint256 contractBalance = address(buyback).balance;
        
        vm.prank(owner);
        buyback.emergencyWithdrawETH(0); // 0 = all
        
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
        assertEq(address(buyback).balance, 0);
    }
    
    function testEmergencyWithdrawETHInsufficientBalance() public {
        uint256 ethAmount = 0.01 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        uint256 contractBalance = address(buyback).balance;
        
        vm.expectRevert(abi.encodeWithSelector(
            BuybackManager.InsufficientETH.selector,
            contractBalance,
            0.02 ether
        ));
        
        vm.prank(owner);
        buyback.emergencyWithdrawETH(0.02 ether);
    }
    
    function testEmergencyWithdrawToken() public {
        uint256 tokenAmount = 1000e18;
        stratToken.mint(address(buyback), tokenAmount);
        
        uint256 ownerBalanceBefore = stratToken.balanceOf(owner);
        
        vm.prank(owner);
        buyback.emergencyWithdrawToken(address(stratToken), tokenAmount);
        
        assertEq(stratToken.balanceOf(owner), ownerBalanceBefore + tokenAmount);
        assertEq(stratToken.balanceOf(address(buyback)), 0);
    }
    
    function testEmergencyWithdrawTokenAll() public {
        uint256 tokenAmount = 1000e18;
        stratToken.mint(address(buyback), tokenAmount);
        
        uint256 ownerBalanceBefore = stratToken.balanceOf(owner);
        
        vm.prank(owner);
        buyback.emergencyWithdrawToken(address(stratToken), 0); // 0 = all
        
        assertEq(stratToken.balanceOf(owner), ownerBalanceBefore + tokenAmount);
        assertEq(stratToken.balanceOf(address(buyback)), 0);
    }
    
    function testEmergencyWithdrawTokenZeroAddress() public {
        vm.expectRevert(BuybackManager.ZeroAddress.selector);
        
        vm.prank(owner);
        buyback.emergencyWithdrawToken(address(0), 100);
    }
    
    function testForceExecuteBuyback() public {
        uint256 ethAmount = 0.005 ether; // Below threshold
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        assertEq(buyback.pendingETH(), ethAmount);
        assertEq(buyback.totalBuybacks(), 0);
        
        // Force execute should work even below threshold
        vm.expectEmit(true, false, false, false);
        emit BuybackExecuted(owner, 0, 0, 0, 0, block.timestamp);
        
        vm.prank(owner);
        buyback.forceExecuteBuyback();
        
        assertEq(buyback.pendingETH(), 0);
        assertEq(buyback.totalBuybacks(), 1);
    }
    
    function testForceExecuteBuybackZeroAmount() public {
        vm.expectRevert(BuybackManager.ZeroAmount.selector);
        
        vm.prank(owner);
        buyback.forceExecuteBuyback();
    }
    
    function testForceExecuteBuybackWhenPaused() public {
        uint256 ethAmount = 0.02 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        vm.prank(owner);
        buyback.pause();
        
        vm.expectRevert(abi.encodeWithSelector(Pausable.EnforcedPause.selector));
        vm.prank(owner);
        buyback.forceExecuteBuyback();
    }
    
    // ==================== VIEW FUNCTIONS TESTS ====================
    
    function testGetStats() public {
        uint256 ethAmount1 = 0.02 ether;
        uint256 ethAmount2 = 0.015 ether;
        
        // First transaction
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount1}(keeper);
        
        // Second transaction
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount2}(keeper);
        
        (
            uint256 totalETHReceived,
            uint256 totalETHUsedForBuyback,
            uint256 totalSTRATBurned,
            uint256 totalBuybacks,
            uint256 totalCallerRewards,
            uint256 pendingETH,
            uint256 contractETHBalance
        ) = buyback.getStats();
        
        assertEq(totalETHReceived, ethAmount1 + ethAmount2);
        assertGt(totalETHUsedForBuyback, 0);
        assertGt(totalSTRATBurned, 0);
        assertEq(totalBuybacks, 2);
        assertGt(totalCallerRewards, 0);
        assertEq(pendingETH, 0);
        assertEq(contractETHBalance, address(buyback).balance);
    }
    
    function testGetConfig() public {
        (
            uint256 _buybackThreshold,
            uint256 _slippageBps,
            uint256 _callerRewardBps,
            bool _autoBuybackEnabled,
            address _router
        ) = buyback.getConfig();
        
        assertEq(_buybackThreshold, DEFAULT_THRESHOLD);
        assertEq(_slippageBps, DEFAULT_SLIPPAGE);
        assertEq(_callerRewardBps, DEFAULT_CALLER_REWARD);
        assertTrue(_autoBuybackEnabled);
        assertEq(_router, address(router));
    }
    
    function testCanTriggerBuyback() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        // Below threshold
        uint256 ethAmount = 0.005 ether;
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        (bool canTrigger, uint256 ethAvailable, uint256 ethNeeded) = buyback.canTriggerBuyback();
        
        assertFalse(canTrigger);
        assertEq(ethAvailable, ethAmount);
        if (DEFAULT_THRESHOLD > ethAmount) {
            assertEq(ethNeeded, DEFAULT_THRESHOLD - ethAmount);
        }
        
        // Above threshold
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount * 3}(keeper);
        
        (canTrigger, ethAvailable, ethNeeded) = buyback.canTriggerBuyback();
        
        assertTrue(canTrigger);
        assertEq(ethAvailable, ethAmount * 4);
        assertEq(ethNeeded, 0);
        
        vm.prank(owner);
        buyback.pause();
        
        try buyback.canTriggerBuyback() returns (bool _canTrigger, uint256, uint256) {
            assertFalse(_canTrigger);
        } catch {
            assertTrue(true);
        }
    }
    
    function testGetExpectedSTRAT() public {
        uint256 ethAmount = 0.01 ether;
        
        (uint256 expectedSTRAT, uint256 minSTRAT) = buyback.getExpectedSTRAT(ethAmount);
        
        uint256 expectedCalculated = (ethAmount * 1e18) / STRAT_PRICE_IN_ETH;
        uint256 minCalculated = (expectedCalculated * (10000 - DEFAULT_SLIPPAGE)) / 10000;
        
        assertEq(expectedSTRAT, expectedCalculated);
        assertEq(minSTRAT, minCalculated);
        
        // Test with zero amount
        (expectedSTRAT, minSTRAT) = buyback.getExpectedSTRAT(0);
        assertEq(expectedSTRAT, 0);
        assertEq(minSTRAT, 0);
    }
    
    function testGetExpectedSTRATNoPrice() public {
        // Set price to 0 (no liquidity)
        router.setTokenPrice(address(stratToken), 0);
        
        (uint256 expectedSTRAT, uint256 minSTRAT) = buyback.getExpectedSTRAT(0.01 ether);
        
        assertEq(expectedSTRAT, 0);
        assertEq(minSTRAT, 0);
    }
    
    // ==================== INTEGRATION TESTS ====================
    
    function testCompleteFlowMultipleBuybacks() public {
        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 0.02 ether;
        amounts[1] = 0.015 ether;
        amounts[2] = 0.025 ether;
        amounts[3] = 0.008 ether; // Below threshold
        amounts[4] = 0.012 ether; // This should trigger buyback of accumulated
        
        uint256 totalSent = 0;
        uint256 expectedBuybacks = 0;
        
        for (uint256 i = 0; i < amounts.length; i++) {
            totalSent += amounts[i];
            
            vm.prank(address(strategyCore));
            buyback.receiveFromStrategy{value: amounts[i]}(keeper);
            
            if (amounts[i] >= DEFAULT_THRESHOLD || 
                (i == 4 && buyback.pendingETH() >= DEFAULT_THRESHOLD)) {
                expectedBuybacks++;
            }
        }
        
        assertEq(buyback.totalETHReceived(), totalSent);
        assertEq(buyback.totalBuybacks(), expectedBuybacks);
        assertGt(buyback.totalSTRATBurned(), 0);
        assertEq(buyback.pendingETH(), 0);
    }
    
    function testFeeOnTransferToken() public {
        // Enable fee on transfer for STRAT token
        router.setFeeOnTransfer(true, 200); // 2% fee
        
        uint256 ethAmount = 0.02 ether;
        uint256 stratBalanceBefore = stratToken.balanceOf(address(buyback));
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        // Should handle fee-on-transfer correctly
        assertGt(buyback.totalSTRATBurned(), 0);
        assertEq(stratToken.balanceOf(address(buyback)), stratBalanceBefore);
    }
    
    function testMultiplePriceChanges() public {
        uint256 ethAmount = 0.02 ether;
        
        // Test with different prices
        uint256[] memory prices = new uint256[](3);
        prices[0] = 0.001 ether; // Current
        prices[1] = 0.002 ether; // Higher (less STRAT)
        prices[2] = 0.0005 ether; // Lower (more STRAT)
        
        uint256[] memory burnAmounts = new uint256[](3);
        
        for (uint256 i = 0; i < prices.length; i++) {
            router.setTokenPrice(address(stratToken), prices[i]);
            
            uint256 burnedBefore = buyback.totalSTRATBurned();
            
            vm.prank(address(strategyCore));
            buyback.receiveFromStrategy{value: ethAmount}(keeper);
            
            burnAmounts[i] = buyback.totalSTRATBurned() - burnedBefore;
        }
        
        // Higher price = less tokens burned
        assertGt(burnAmounts[0], burnAmounts[1]);
        // Lower price = more tokens burned
        assertGt(burnAmounts[2], burnAmounts[0]);
    }
    
    // ==================== EDGE CASES ====================
    
    function testBuybackWithMaxValues() public {
        vm.startPrank(owner);
        
        // Set maximum threshold
        buyback.setBuybackThreshold(buyback.MAX_BUYBACK_THRESHOLD());
        
        buyback.setAutoBuyback(false);
        
        vm.stopPrank();
        
        // Send max threshold amount
        uint256 maxAmount = buyback.MAX_BUYBACK_THRESHOLD();
        vm.deal(address(strategyCore), maxAmount + 1 ether);
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: maxAmount}(keeper);
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertEq(buyback.totalBuybacks(), 1);
        assertGt(buyback.totalSTRATBurned(), 0);
    }
    
    function testBuybackWithMinValues() public {
        vm.startPrank(owner);
        
        // Set minimum threshold
        buyback.setBuybackThreshold(buyback.MIN_BUYBACK_THRESHOLD());
        buyback.setAutoBuyback(false);
        
        vm.stopPrank();
        
        vm.startPrank(address(strategyCore));
        buyback.receiveFromStrategy{value: buyback.MIN_BUYBACK_THRESHOLD()}(keeper);
        vm.stopPrank();
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertEq(buyback.totalBuybacks(), 1);
        assertGt(buyback.totalSTRATBurned(), 0);
    }
    
    function testAccumulationAcrossMultipleTransactions() public {
        uint256 smallAmount = 0.003 ether; // Below threshold
        
        // Send multiple small amounts
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(address(strategyCore));
            buyback.receiveFromStrategy{value: smallAmount}(keeper);
            
            if (i < 3) {
                // Should not trigger buyback
                assertEq(buyback.totalBuybacks(), 0);
            }
        }
        
        // Fourth transaction should trigger buyback (0.012 ETH total > 0.01 ETH threshold)
        assertEq(buyback.totalBuybacks(), 1);
        assertEq(buyback.pendingETH(), 0);
    }
    
    function testBurnFallbackToDeadAddress() public {
        // Make burn function revert
        stratToken.setShouldRevertBurn(true);
        // But allow transfers
        stratToken.setShouldRevertTransfer(false);
        
        uint256 ethAmount = 0.02 ether;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        // Should fallback to transferring to dead address
        assertGt(stratToken.balanceOf(address(0xdead)), 0);
        assertEq(buyback.totalBuybacks(), 1);
    }
    
    function testBurnAndTransferBothFail() public {
        vm.prank(owner);
        buyback.setAutoBuyback(false);
        
        // Make both burn and transfer fail
        stratToken.setShouldRevertBurn(true);
        stratToken.setShouldRevertTransfer(true);
        
        uint256 ethAmount = 0.02 ether;
        
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        
        vm.expectEmit(true, false, false, false);
        emit BuybackFailed("Transfer failed", ethAmount - (ethAmount * DEFAULT_CALLER_REWARD / 10000), user, block.timestamp);
        
        vm.prank(user);
        buyback.triggerBuyback();
        
        assertGt(buyback.pendingETH(), 0);
        assertEq(buyback.totalBuybacks(), 0);
    }
    
    // ==================== REENTRANCY TESTS ====================
    
    function testReentrancyProtection() public {
        ReentrantAttacker attacker = new ReentrantAttacker();
        
        vm.prank(owner);
        BuybackManager newBuyback = new BuybackManager(
            address(stratToken),
            address(attacker),
            address(router),
            owner
        );
        
        vm.startPrank(owner);
        newBuyback.setAutoBuyback(false);
        newBuyback.setBuybackThreshold(0.01 ether);
        vm.stopPrank();
        
        attacker.setBuyback(address(newBuyback));
        router.setTokenPrice(address(stratToken), STRAT_PRICE_IN_ETH);
        
        vm.deal(address(attacker), 1 ether);
        
        vm.prank(address(attacker));
        newBuyback.receiveFromStrategy{value: 0.02 ether}(address(attacker));
        
        
        attacker.attemptReentry();
        
        assertEq(newBuyback.totalBuybacks(), 1);
        assertEq(newBuyback.pendingETH(), 0);
        
    }
    
    // ==================== FALLBACK TESTS ====================
    
    function testReceiveFunctionFromUnauthorized() public {
        vm.prank(user);
        (bool success, ) = address(buyback).call{value: 1 ether}("");
        
        assertFalse(success);
    }
    
    function testReceiveFunctionFromStrategyCore() public {
        vm.expectRevert("Use receiveFromStrategy function");
        
        vm.prank(address(strategyCore));
        (bool success, ) = address(buyback).call{value: 1 ether}("");
        
    }

    function callReceive(address target) external payable {
        (bool success, ) = target.call{value: msg.value}("");
        require(success, "Call failed");
    }
    
    function testFallbackFunction() public {
        (bool success, bytes memory data) = address(buyback).call{value: 1 ether}(abi.encodeWithSignature("nonExistentFunction()"));
        
        assertFalse(success);

    }
    
    // ==================== GAS OPTIMIZATION TESTS ====================
    
    function testGasConsumption() public {
        uint256 ethAmount = 0.02 ether;
        
        uint256 gasStart = gasleft();
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: ethAmount}(keeper);
        uint256 gasUsed = gasStart - gasleft();
        
        assertLt(gasUsed, 400000);
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    function _sendETHAndTriggerBuyback(uint256 amount) internal {
        vm.prank(address(strategyCore));
        buyback.receiveFromStrategy{value: amount}(keeper);
    }
    
    function _assertBuybackExecuted() internal {
        assertEq(buyback.pendingETH(), 0);
        assertGt(buyback.totalBuybacks(), 0);
        assertGt(buyback.totalSTRATBurned(), 0);
        assertGt(buyback.totalETHUsedForBuyback(), 0);
    }
}

// ==================== HELPER CONTRACTS ====================

contract RejectETH {
    // Contract that rejects ETH transfers
    receive() external payable {
        revert("Cannot receive ETH");
    }
}

contract ReentrantAttacker {
    address public buyback;
    bool public attacking = false;
    
    function setBuyback(address _buyback) external {
        buyback = _buyback;
    }
    
    function attemptReentry() external {
        attacking = true;
        BuybackManager(payable(buyback)).triggerBuyback();
    }
    
    receive() external payable {
        if (attacking && buyback != address(0)) {
            attacking = false;
            
            try BuybackManager(payable(buyback)).triggerBuyback() {
                revert("Reentrancy should have failed!");
            } catch (bytes memory reason) {
                return;
            }
        }
    }
}