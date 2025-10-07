// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/StrategyCore.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock PENGU Token
contract MockPengu is ERC20 {
    constructor() ERC20("Mock PENGU", "PENGU") {
        _mint(msg.sender, 1000000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock Uniswap Router
contract MockRouter {
    address public WETH;
    bool public shouldRevert = false;
    uint256 public mockEthOutput = 1 ether;
    
    constructor(address _weth) {
        WETH = _weth;
    }
    
    function setMockEthOutput(uint256 _output) external {
        mockEthOutput = _output;
    }
    
    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }
    
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint /*amountIn*/,
        uint /*amountOutMin*/,
        address[] calldata /*path*/,
        address to,
        uint /*deadline*/
    ) external {
        if (shouldRevert) {
            revert("Mock swap failed");
        }
        
        // Simulate sending ETH to the recipient
        (bool success, ) = payable(to).call{value: mockEthOutput}("");
        require(success, "ETH transfer failed");
    }
}

// Mock Buyback Manager
contract MockBuybackManager {
    uint256 public receivedETH;
    address public lastCaller;
    bool public shouldRevert = false;
    
    function receiveFromStrategy(address caller) external payable {
        if (shouldRevert) {
            revert("Mock revert");
        }
        receivedETH += msg.value;
        lastCaller = caller;
    }
    
    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }
    
    function reset() external {
        receivedETH = 0;
        lastCaller = address(0);
    }
}

contract StrategyCoreTest is Test {
    StrategyCore public core;
    MockPengu public pengu;
    MockRouter public router;
    MockBuybackManager buyback;
    
    address public owner = address(0x1);
    address public feeCollector = address(0x2);
    address public weth = address(0x3);
    address public user = address(0x4);
    
    // Test constants
    uint256 constant INITIAL_PRICE = 0.001 ether; // 0.001 ETH per PENGU
    uint256 constant TEST_DEPOSIT_AMOUNT = 1000e18; // 1000 PENGU
    uint256 constant TEST_ETH_SPENT = 1 ether; // 1 ETH

    event BuybackTransferFailed(uint256 ethAmount, address buybackManager);
    
    event PenguDeposited(
        uint256 indexed lotId,
        uint256 amountPengu,
        uint256 ethSpent,
        uint256 avgPriceWeiPerPengu
    );
    
    event OraclePriceUpdated(uint256 newPrice, uint256 timestamp, address updatedBy);
    
    event TPExecuted(
        uint256 indexed lotId,
        uint256 amountSold,
        uint256 ethReceived,
        uint256 priceAtSale
    );

    function setUp() public {
        // Deploy mock contracts
        pengu = new MockPengu();
        router = new MockRouter(weth);
        buyback = new MockBuybackManager();
        
        // Deploy StrategyCore
        vm.prank(owner);
        core = new StrategyCore(
            address(pengu),
            feeCollector,
            address(router),
            address(buyback),
            owner
        );
        
        // Setup initial balances
        pengu.mint(feeCollector, 10000e18);
        pengu.mint(address(core), 5000e18);
        vm.deal(address(router), 100 ether);
        vm.deal(address(this), 10 ether);
        
        // Approve tokens
        vm.prank(feeCollector);
        pengu.approve(address(core), type(uint256).max);
    }

    // ==================== ORACLE PRICE TESTS ====================

    function testUpdatePenguPrice() public {
        uint256 newPrice = 0.002 ether;
        
        vm.expectEmit(true, true, true, true);
        emit OraclePriceUpdated(newPrice, block.timestamp, owner);
        
        vm.prank(owner);
        core.updatePenguPrice(newPrice);
        
        assertEq(core.penguOraclePrice(), newPrice);
        assertEq(core.penguPriceLastUpdated(), block.timestamp);
        assertTrue(core.isPriceFresh());
    }

    function testUpdatePenguPriceOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        core.updatePenguPrice(0.001 ether);
    }

    function testUpdatePenguPriceZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("PriceOutOfBounds(uint256,uint256,uint256)", 0, 1, type(uint256).max));
        core.updatePenguPrice(0);
    }

    function testUpdatePenguPriceTooHighReverts() public {
        uint256 tooHighPrice = 1001 ether;
        
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("PriceOutOfBounds(uint256,uint256,uint256)", tooHighPrice, 0, 1000 ether));
        core.updatePenguPrice(tooHighPrice);
    }

    function testGetPenguPriceFresh() public {
        // Set initial price
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        
        uint256 price = core.getPenguPrice();
        assertEq(price, INITIAL_PRICE);
    }

    function testGetPenguPriceStale() public {
        // Set initial price
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        
        // Fast forward past staleness threshold
        vm.warp(block.timestamp + 31 minutes);
        
        vm.expectRevert(abi.encodeWithSignature("PriceStale(uint256,uint256)", 31 minutes, 30 minutes));
        core.getPenguPrice();
    }

    function testIsPriceFresh() public {
        // Initially no price set, should be false
        assertFalse(core.isPriceFresh());
        
        // Set price
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        assertTrue(core.isPriceFresh());
        
        // Still fresh after 29 minutes
        vm.warp(block.timestamp + 29 minutes);
        assertTrue(core.isPriceFresh());
        
        // Stale after 31 minutes
        vm.warp(block.timestamp + 2 minutes); // Total 31 minutes
        assertFalse(core.isPriceFresh());
    }

    function testGetOraclePriceInfo() public {
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        
        (uint256 price, uint256 lastUpdated, bool isFresh, uint256 age) = core.getOraclePriceInfo();
        
        assertEq(price, INITIAL_PRICE);
        assertEq(lastUpdated, block.timestamp);
        assertTrue(isFresh);
        assertEq(age, 0);
        
        // Test after time passes
        vm.warp(block.timestamp + 10 minutes);
        (, , isFresh, age) = core.getOraclePriceInfo();
        
        assertTrue(isFresh);
        assertEq(age, 10 minutes);
    }

    // ==================== DEPOSIT TESTS ====================

    function testDepositPengu() public {
        // Set price first
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        
        // Unpause contract
        vm.prank(owner);
        core.unpause();
        
        uint256 expectedAvgPrice = (TEST_ETH_SPENT * 1e18) / TEST_DEPOSIT_AMOUNT;
        
        vm.expectEmit(true, true, true, true);
        emit PenguDeposited(0, TEST_DEPOSIT_AMOUNT, TEST_ETH_SPENT, expectedAvgPrice);
        
        vm.prank(feeCollector);
        core.depositPengu(TEST_DEPOSIT_AMOUNT, TEST_ETH_SPENT);
        
        // Check lot was created
        StrategyCore.Lot memory lot = core.getLot(0);
        
        assertEq(lot.amountPengu, TEST_DEPOSIT_AMOUNT);
        assertEq(lot.ethSpent, TEST_ETH_SPENT);
        assertEq(lot.avgPriceWeiPerPengu, expectedAvgPrice);
        assertTrue(lot.active);
        assertEq(lot.timestamp, block.timestamp);
        
        // Check stats
        (uint256 totalLots, uint256 activeLots,,,,,) = core.getStats();
        assertEq(totalLots, 1);
        assertEq(activeLots, 1);
    }

    function testDepositPenguOnlyFeeCollector() public {
        vm.prank(owner);
        core.unpause();
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("UnauthorizedCaller(address)", user));
        core.depositPengu(TEST_DEPOSIT_AMOUNT, TEST_ETH_SPENT);
    }

    function testDepositPenguZeroAmountReverts() public {
        vm.prank(owner);
        core.unpause();
        
        vm.prank(feeCollector);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        core.depositPengu(0, TEST_ETH_SPENT);
    }

    function testDepositPenguZeroEthReverts() public {
        vm.prank(owner);
        core.unpause();
        
        vm.prank(feeCollector);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        core.depositPengu(TEST_DEPOSIT_AMOUNT, 0);
    }

    function testDepositPenguWhenPaused() public {
        vm.prank(feeCollector);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        core.depositPengu(TEST_DEPOSIT_AMOUNT, TEST_ETH_SPENT);
    }

    // ==================== TP LADDER TESTS ====================

    function testSetTPLadder() public {
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](3);
        ladder[0] = StrategyCore.TP(1250, 3000); // 1.25x, 30%
        ladder[1] = StrategyCore.TP(1500, 4000); // 1.5x, 40%
        ladder[2] = StrategyCore.TP(2000, 3000); // 2.0x, 30%
        
        vm.prank(owner);
        core.setTPLadder(ladder);
        
        StrategyCore.TP[] memory storedLadder = core.getTPLadder();
        assertEq(storedLadder.length, 3);
        assertEq(storedLadder[0].multiplierX1000, 1250);
        assertEq(storedLadder[0].percentBps, 3000);
    }

    function testSetTPLadderInvalidSum() public {
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](2);
        ladder[0] = StrategyCore.TP(1250, 3000); // 30%
        ladder[1] = StrategyCore.TP(1500, 3000); // 30% (total 60%, not 100%)
        
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSignature("TPLadderSumMismatch(uint256,uint256)", 6000, 10000));
        core.setTPLadder(ladder);
    }

    function testSetTPLadderOnlyOwner() public {
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](1);
        ladder[0] = StrategyCore.TP(1250, 10000);
        
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        core.setTPLadder(ladder);
    }

    // ==================== TP EXECUTION TESTS ====================

    function testCheckAndExecuteTP() public {
        _setupTPTest();
        
        // Set TP ladder
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](1);
        ladder[0] = StrategyCore.TP(1500, 10000); // 1.5x, 100%
        
        vm.prank(owner);
        core.setTPLadder(ladder);
        
        // Set higher price to trigger TP
        uint256 triggerPrice = 0.0015 ether; // 1.5x of 0.001
        vm.prank(owner);
        core.updatePenguPrice(triggerPrice);
        
        vm.expectEmit(true, true, true, true);
        emit TPExecuted(0, TEST_DEPOSIT_AMOUNT, 1 ether, triggerPrice);
        
        core.checkAndExecuteTP(0);
        
        // Check lot is now inactive
        StrategyCore.Lot memory lot = core.getLot(0);
        assertFalse(lot.active);
        
        // Check buyback received ETH
        assertEq(buyback.receivedETH(), 1 ether);
    }

    function testCheckAndExecuteTPNotTriggered() public {
        _setupTPTest();
        
        // Set TP ladder
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](1);
        ladder[0] = StrategyCore.TP(2000, 10000); // 2.0x, 100%
        
        vm.prank(owner);
        core.setTPLadder(ladder);
        
        // Price not high enough (need 0.002, have 0.001)
        core.checkAndExecuteTP(0);
        
        // Lot should still be active
        StrategyCore.Lot memory lot = core.getLot(0);
        assertTrue(lot.active);
        
        // No ETH sent to buyback
        assertEq(buyback.receivedETH(), 0);
    }

    function testBatchProcessTP() public {
        _setupMultipleLots();
        
        // Set TP ladder that will trigger for all lots
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](1);
        ladder[0] = StrategyCore.TP(1200, 10000); // 1.2x, 100%
        
        vm.prank(owner);
        core.setTPLadder(ladder);
        
        // Set price high enough to trigger all
        vm.prank(owner);
        core.updatePenguPrice(0.0012 ether);
        
        core.batchProcessTP(3);
        
        // Check all lots processed
        (, uint256 activeLots,,,,,) = core.getStats();
        assertEq(activeLots, 0);
    }

    function testTPExecutionWhenPaused() public {
        _setupTPTest(); 
        
        vm.prank(owner);
        core.pause();
        
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        core.checkAndExecuteTP(0);
    }

    function testTPExecutionWhenDisabled() public {
        _setupTPTest();
        
        vm.prank(owner);
        core.updateConfig(10, false);
        
        vm.expectRevert("TP execution disabled");
        core.checkAndExecuteTP(0);
    }


    function testBuybackIntegration() public {
        _setupTPTest();

        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](3);
        ladder[0] = StrategyCore.TP(1500, 3000); // 1.5x, 30%
        ladder[1] = StrategyCore.TP(2000, 4000); // 2.0x, 40%
        ladder[2] = StrategyCore.TP(3000, 3000); // 3.0x, 30%

        vm.prank(owner);
        core.setTPLadder(ladder);

        uint256 triggerPrice = 0.0015 ether; // 1.5x of 0.001
        vm.prank(owner);
        core.updatePenguPrice(triggerPrice);

        core.checkAndExecuteTP(0);

        assertGt(buyback.receivedETH(), 0);
        assertEq(buyback.lastCaller(), tx.origin);
    }

    function testBuybackManagerFailure() public {
        _setupTPTest();

        buyback.setShouldRevert(true);

        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](1);
        ladder[0] = StrategyCore.TP(1500, 10000); // Весь лот при 1.5x

        vm.prank(owner);
        core.setTPLadder(ladder);

        uint256 triggerPrice = 0.0015 ether;
        vm.prank(owner);
        core.updatePenguPrice(triggerPrice);

        uint256 coreBalanceBefore = address(core).balance;
        
        core.checkAndExecuteTP(0);

        assertGt(address(core).balance, coreBalanceBefore);
        assertEq(buyback.receivedETH(), 0);
    }

    // ==================== ADMIN FUNCTION TESTS ====================

    function testSetRouter() public {
        address newRouter = address(0x999);
        
        vm.prank(owner);
        core.setRouter(newRouter);
        
        assertEq(address(core.router()), newRouter);
    }

    function testSetRouterOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        core.setRouter(address(0x999));
    }

    function testSetBuybackManager() public {
        address newBuyback = address(0x888);
        
        vm.prank(owner);
        core.setBuybackManager(newBuyback);
        
        assertEq(core.buybackManager(), newBuyback);
    }

    function testUpdateConfig() public {
        vm.prank(owner);
        core.updateConfig(5, false);
        
        assertEq(core.maxLotsPerExecution(), 5);
        assertFalse(core.tpExecutionEnabled());
    }

    function testPauseUnpause() public {
        vm.prank(owner);
        core.unpause();
        assertFalse(core.paused());
        
        vm.prank(owner);
        core.pause();
        assertTrue(core.paused());
    }

    // ==================== EMERGENCY FUNCTION TESTS ====================

    function testEmergencyWithdrawETH() public {
        // Send some ETH to contract
        vm.deal(address(core), 5 ether);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        core.emergencyWithdrawETH(2 ether);
        
        assertEq(owner.balance, ownerBalanceBefore + 2 ether);
        assertEq(address(core).balance, 3 ether);
    }

    function testEmergencyWithdrawETHAll() public {
        vm.deal(address(core), 3 ether);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        core.emergencyWithdrawETH(0); // 0 means all
        
        assertEq(owner.balance, ownerBalanceBefore + 3 ether);
        assertEq(address(core).balance, 0);
    }

    function testEmergencyWithdrawToken() public {
        uint256 withdrawAmount = 1000e18;
        
        uint256 ownerBalanceBefore = pengu.balanceOf(owner);
        
        vm.prank(owner);
        core.emergencyWithdrawToken(address(pengu), withdrawAmount);
        
        assertEq(pengu.balanceOf(owner), ownerBalanceBefore + withdrawAmount);
    }

    function testEmergencyDeactivateLot() public {
        _setupTPTest();
        
        vm.prank(owner);
        core.emergencyDeactivateLot(0);
        
        StrategyCore.Lot memory lot = core.getLot(0);
        assertFalse(lot.active);
        
        (, uint256 activeLots,,,,,) = core.getStats();
        assertEq(activeLots, 0);
    }

    // ==================== VIEW FUNCTION TESTS ====================

    function testGetStats() public {
        _setupMultipleLots();
        
        (
            uint256 totalLots,
            uint256 activeLots,
            uint256 headPointer,
            uint256 tailPointer,
            uint256 penguBalance,
            uint256 tpLevels,
            uint256 currentPrice
        ) = core.getStats();
        
        assertEq(totalLots, 3);
        assertEq(activeLots, 3);
        assertEq(headPointer, 0);
        assertEq(tailPointer, 3);
        assertGt(penguBalance, 0);
        assertEq(tpLevels, 0); // No TP ladder set
        assertEq(currentPrice, INITIAL_PRICE);
    }

    function testGetLot() public {
        _setupTPTest();
        
        StrategyCore.Lot memory lot = core.getLot(0);
        
        assertEq(lot.amountPengu, TEST_DEPOSIT_AMOUNT);
        assertEq(lot.ethSpent, TEST_ETH_SPENT);
        assertTrue(lot.active);
        assertEq(lot.timestamp, block.timestamp);
    }

    function testGetLotInvalidId() public {
        vm.expectRevert(abi.encodeWithSignature("LotNotFound(uint256)", 999));
        core.getLot(999);
    }

    function testGetLastOraclePrice() public {
        // Initially should return 0
        (uint256 price, uint256 lastUpdated) = core.getLastOraclePrice();
        assertEq(price, 0);
        assertEq(lastUpdated, 0);

        // Set price
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        
        (price, lastUpdated) = core.getLastOraclePrice();
        assertEq(price, INITIAL_PRICE);
        assertEq(lastUpdated, block.timestamp);
    }

    function testGetAllActiveLotsEmpty() public {
        (uint256[] memory lotIds, StrategyCore.Lot[] memory lots) = core.getAllActiveLots();
        assertEq(lotIds.length, 0);
        assertEq(lots.length, 0);
    }

    function testGetAllActiveLots() public {
        _setupMultipleLots(); // Creates 3 lots
        
        (uint256[] memory lotIds, StrategyCore.Lot[] memory lots) = core.getAllActiveLots();
        
        // Should return 3 active lots
        assertEq(lotIds.length, 3);
        assertEq(lots.length, 3);
        
        // Check lot IDs are sequential
        assertEq(lotIds[0], 0);
        assertEq(lotIds[1], 1); 
        assertEq(lotIds[2], 2);
        
        // Check lot data
        assertEq(lots[0].amountPengu, TEST_DEPOSIT_AMOUNT);
        assertTrue(lots[0].active);
        assertEq(lots[1].amountPengu, TEST_DEPOSIT_AMOUNT);
        assertTrue(lots[1].active);
        assertEq(lots[2].amountPengu, TEST_DEPOSIT_AMOUNT);
        assertTrue(lots[2].active);
    }

    function testGetAllActiveLotsAfterDeactivation() public {
        _setupMultipleLots(); // Creates 3 lots
        
        // Deactivate lot 1
        vm.prank(owner);
        core.emergencyDeactivateLot(1);
        
        (uint256[] memory lotIds, StrategyCore.Lot[] memory lots) = core.getAllActiveLots();
        
        // Should return 2 active lots (0 and 2)
        assertEq(lotIds.length, 2);
        assertEq(lots.length, 2);
        assertEq(lotIds[0], 0);
        assertEq(lotIds[1], 2);
    }

    // ==================== ERROR CONDITION TESTS ====================

    function testSwapFailure() public {
        _setupTPTest();
        
        // Set router to fail
        router.setShouldRevert(true);
        
        StrategyCore.TP[] memory ladder = new StrategyCore.TP[](1);
        ladder[0] = StrategyCore.TP(1500, 10000);
        
        vm.prank(owner);
        core.setTPLadder(ladder);
        
        vm.prank(owner);
        core.updatePenguPrice(0.0015 ether);
        
        vm.expectRevert(abi.encodeWithSignature("SwapFailed()"));
        core.checkAndExecuteTP(0);
    }

    function testLotNotActive() public {
        _setupTPTest();
        
        // Deactivate lot
        vm.prank(owner);
        core.emergencyDeactivateLot(0);
        
        vm.expectRevert(abi.encodeWithSignature("LotNotActive(uint256)", 0));
        core.checkAndExecuteTP(0);
    }

    // ==================== HELPER FUNCTIONS ====================

    function _setupTPTest() internal {
        // Set initial price
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);

        // Unpause
        vm.prank(owner);
        core.unpause();


        buyback.reset();

        // Deposit PENGU
        vm.prank(feeCollector);
        core.depositPengu(TEST_DEPOSIT_AMOUNT, TEST_ETH_SPENT);
    }

    function _setupMultipleLots() internal {
        // Set initial price
        vm.prank(owner);
        core.updatePenguPrice(INITIAL_PRICE);
        
        // Unpause
        vm.prank(owner);
        core.unpause();
        
        // Create multiple lots
        for (uint i = 0; i < 3; i++) {
            vm.prank(feeCollector);
            core.depositPengu(TEST_DEPOSIT_AMOUNT, TEST_ETH_SPENT);
        }
    }

    receive() external payable {}
}