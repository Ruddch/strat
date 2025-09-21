// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/FeeCollector.sol";

// Mock PENGU token
contract MockPengu {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply = 1_000_000e18;

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        require(balanceOf[from] >= amount, "Insufficient balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    // Helper function to mint tokens for testing
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
}

// Mock Uniswap Router
contract MockRouter {
    address public wethAddress;
    uint256 public tokensToReturn;
    bool public shouldRevert;
    uint256[] public mockAmountsOut;

    constructor(address _weth) {
        wethAddress = _weth;
    }

    function factory() external pure returns (address) {
        return address(0x1234);
    }

    function WETH() external view returns (address) {
        return wethAddress;
    }

    function setSwapResult(uint256 _tokensToReturn, bool _shouldRevert) external {
        tokensToReturn = _tokensToReturn;
        shouldRevert = _shouldRevert;
    }

    function setAmountsOut(uint256[] calldata amounts) external {
        delete mockAmountsOut;
        for (uint i = 0; i < amounts.length; i++) {
            mockAmountsOut.push(amounts[i]);
        }
    }

    function getAmountsOut(uint256 /* amountIn */, address[] calldata /* path */) 
        external view returns (uint256[] memory amounts) {
        require(mockAmountsOut.length > 0, "No mock data");
        amounts = new uint256[](mockAmountsOut.length);
        for (uint i = 0; i < mockAmountsOut.length; i++) {
            amounts[i] = mockAmountsOut[i];
        }
    }

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 /* amountOutMin */,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external payable {
        require(!shouldRevert, "Mock swap failed");
        
        // Transfer mock PENGU tokens to recipient
        MockPengu pengu = MockPengu(path[1]);
        pengu.mint(to, tokensToReturn);
    }
}

// Mock StrategyCore
contract MockStrategyCore {
    uint256 public lastAmountPengu;
    uint256 public lastEthSpent;
    address public lastCaller;
    bool public shouldRevert;

    function setRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function depositPengu(uint256 amountPengu, uint256 ethSpent) external {
        require(!shouldRevert, "Mock strategy failed");
        lastAmountPengu = amountPengu;
        lastEthSpent = ethSpent;
        lastCaller = msg.sender;
    }
}

// Mock Treasury
contract MockTreasury {
    uint256 public lastAmount;
    address public lastCaller;
    bool public shouldRevert;

    function setRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function depositPengu(uint256 amount) external {
        require(!shouldRevert, "Mock treasury failed");
        lastAmount = amount;
        lastCaller = msg.sender;
    }
}

contract FeeCollectorTest is Test {
    FeeCollector public feeCollector;
    MockPengu public pengu;
    MockRouter public router;
    MockStrategyCore public strategyCore;
    MockTreasury public treasury;

    address public owner = address(0x1);
    address public alice = address(0x2);
    address public weth = address(0x3);

    event ETHReceived(address indexed from, uint256 amount);
    event FeeProcessed(uint256 ethUsed, uint256 penguReceived, uint256 toStrategy, uint256 toTreasury);

    function setUp() public {
        // Deploy mock contracts
        pengu = new MockPengu();
        router = new MockRouter(weth);
        strategyCore = new MockStrategyCore();
        treasury = new MockTreasury();

        // Deploy FeeCollector
        feeCollector = new FeeCollector(
            address(pengu),
            address(router),
            address(strategyCore),
            address(treasury),
            owner
        );

        // Setup initial state
        vm.deal(address(feeCollector), 2 ether);
        vm.deal(alice, 10 ether);
        vm.deal(owner, 10 ether);
    }

    function testReceiveETH() public {
        uint256 balanceBefore = address(feeCollector).balance;
        
        vm.expectEmit(true, true, true, true);
        emit ETHReceived(alice, 1 ether);
        
        vm.prank(alice);
        (bool success, ) = address(feeCollector).call{value: 1 ether}("");
        assertTrue(success);
        
        assertEq(address(feeCollector).balance, balanceBefore + 1 ether);
    }

    function testReceiveETHFunction() public {
        uint256 balanceBefore = address(feeCollector).balance;
        
        vm.expectEmit(true, true, true, true);
        emit ETHReceived(alice, 1 ether);
        
        vm.prank(alice);
        feeCollector.receiveETH{value: 1 ether}();
        
        assertEq(address(feeCollector).balance, balanceBefore + 1 ether);
    }

    function testProcessFeesSuccess() public {
        uint256 penguAmount = 1000e18;
        router.setSwapResult(penguAmount, false);
        
        uint256 ethBefore = address(feeCollector).balance;
        uint256 expectedEthUsed = feeCollector.useAmount();
        
        vm.expectEmit(true, true, true, true);
        emit FeeProcessed(
            expectedEthUsed, 
            penguAmount, 
            (penguAmount * 7000) / 10000, 
            (penguAmount * 3000) / 10000
        );
        
        vm.prank(alice);
        feeCollector.processFees(penguAmount);
        
        // Check ETH was used
        assertEq(address(feeCollector).balance, ethBefore - expectedEthUsed);
        
        // Check PENGU distribution
        assertEq(pengu.balanceOf(address(strategyCore)), (penguAmount * 7000) / 10000);
        assertEq(pengu.balanceOf(address(treasury)), (penguAmount * 3000) / 10000);
        
        // Check deposit calls
        assertEq(strategyCore.lastAmountPengu(), (penguAmount * 7000) / 10000);
        assertEq(treasury.lastAmount(), (penguAmount * 3000) / 10000);
    }

    function testProcessFeesWithSlippage() public {
        uint256 actualTokens = 1000e18;    
        uint256 expectedTokens = 1050e18;
        router.setSwapResult(actualTokens, false);
        
        // Setup mock price data
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = feeCollector.useAmount();
        amounts[1] = expectedTokens; // Expected tokens = 1050
        router.setAmountsOut(amounts);
        
        vm.prank(alice);
        feeCollector.processFeesWithSlippage(500); // 5% slippage
        // minTokens = 1050 * 0.95 = 997.5
        
        assertEq(pengu.balanceOf(address(strategyCore)), (actualTokens * 7000) / 10000);
        assertEq(pengu.balanceOf(address(treasury)), (actualTokens * 3000) / 10000);
    }

    function testInsufficientBalance() public {
        // Set balance below threshold
        vm.deal(address(feeCollector), 0.5 ether);
        
        vm.prank(alice);
        vm.expectRevert(FeeCollector.InsufficientBalance.selector);
        feeCollector.processFees(1000e18);
    }

    function testSwapFailure() public {
        router.setSwapResult(1000e18, true); // Set to revert
        
        vm.prank(alice);
        vm.expectRevert(FeeCollector.SwapFailed.selector);
        feeCollector.processFees(1000e18);
    }

    function testInsufficientTokensReceived() public {
        uint256 penguAmount = 500e18;
        uint256 minTokens = 1000e18;
        router.setSwapResult(penguAmount, false);
        
        vm.prank(alice);
        vm.expectRevert(FeeCollector.InsufficientTokensReceived.selector);
        feeCollector.processFees(minTokens);
    }

    function testSetThreshold() public {
        uint256 newThreshold = 2 ether;
        
        vm.prank(owner);
        feeCollector.setThreshold(newThreshold);
        
        assertEq(feeCollector.threshold(), newThreshold);
    }

    function testSetThresholdZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(FeeCollector.InvalidThreshold.selector);
        feeCollector.setThreshold(0);
    }

    function testSetUseAmount() public {
        uint256 newAmount = 1.5 ether;
        
        vm.prank(owner);
        feeCollector.setUseAmount(newAmount);
        
        assertEq(feeCollector.useAmount(), newAmount);
    }

    function testSetGasReserve() public {
        uint256 newReserve = 0.1 ether;
        
        vm.prank(owner);
        feeCollector.setGasReserve(newReserve);
        
        assertEq(feeCollector.gasReserve(), newReserve);
    }

    function testSetRouter() public {
        address newRouter = address(0x999);
        
        vm.prank(owner);
        feeCollector.setRouter(newRouter);
        
        assertEq(address(feeCollector.router()), newRouter);
    }

    function testOnlyOwnerModifiers() public {
        vm.prank(alice);
        vm.expectRevert();
        feeCollector.setThreshold(2 ether);
        
        vm.prank(alice);
        vm.expectRevert();
        feeCollector.emergencyWithdrawETH(1 ether);
    }

    function testEmergencyWithdrawETH() public {
        uint256 withdrawAmount = 1 ether;
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        feeCollector.emergencyWithdrawETH(withdrawAmount);
        
        assertEq(owner.balance, ownerBalanceBefore + withdrawAmount);
    }

    function testEmergencyWithdrawToken() public {
        uint256 tokenAmount = 500e18;
        pengu.mint(address(feeCollector), tokenAmount);
        
        vm.prank(owner);
        feeCollector.emergencyWithdrawToken(address(pengu), tokenAmount);
        
        assertEq(pengu.balanceOf(owner), tokenAmount);
    }

    function testCanProcess() public view {
        (bool canProcessNow, uint256 availableAmount) = feeCollector.canProcess();
        
        assertTrue(canProcessNow);
        assertGt(availableAmount, 0);
    }

    function testCanProcessInsufficientBalance() public {
        vm.deal(address(feeCollector), 0.5 ether);
        
        (bool canProcessNow, uint256 availableAmount) = feeCollector.canProcess();
        
        assertFalse(canProcessNow);
        assertEq(availableAmount, 0);
    }

    function testGetConfig() public view {
        (
            uint256 _threshold,
            uint256 _useAmount,
            uint256 _gasReserve,
            address _penguAddress,
            address _router,
            address _strategyCore,
            address _treasury
        ) = feeCollector.getConfig();
        
        assertEq(_threshold, feeCollector.threshold());
        assertEq(_useAmount, feeCollector.useAmount());
        assertEq(_gasReserve, feeCollector.gasReserve());
        assertEq(_penguAddress, address(pengu));
        assertEq(_router, address(router));
        assertEq(_strategyCore, address(strategyCore));
        assertEq(_treasury, address(treasury));
    }

    function testGetExpectedTokens() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1 ether;
        amounts[1] = 1000e18;
        router.setAmountsOut(amounts);
        
        uint256 expected = feeCollector.getExpectedTokens(1 ether);
        assertEq(expected, 1000e18);
    }
}