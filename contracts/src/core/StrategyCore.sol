// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Uniswap interfaces for swapping
interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function WETH() external view returns (address);
}

interface IBuybackManager {
    function receiveFromStrategy(address caller) external payable;
}

/**
 * @title StrategyCore
 * @dev Manages PENGU lots and executes take-profit ladder strategy with oracle pricing
 */
contract StrategyCore is Ownable, Pausable, ReentrancyGuard {
    
    // ==================== STRUCTS ====================
    
    struct Lot {
        uint256 amountPengu;           // Amount of PENGU tokens in this lot
        uint256 ethSpent;              // ETH spent to acquire this lot
        uint256 avgPriceWeiPerPengu;   // Average price in wei per PENGU
        uint256 timestamp;             // When this lot was created
        bool active;                   // Whether this lot is active
    }
    
    struct TP {
        uint32 multiplierX1000;        // Multiplier * 1000 (e.g., 1250 = 1.25x)
        uint16 percentBps;             // Percentage in basis points (e.g., 2500 = 25%)
    }
    
    // ==================== CONSTANTS ====================
    
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_TP_LEVELS = 10;
    uint256 public constant MAX_LOTS_PER_CALL = 50;
    uint256 public constant MAX_DEADLINE_BUFFER = 300; // 5 minutes
    
    // ==================== STATE VARIABLES ====================
    
    // Core addresses
    address public immutable penguAddress;
    address public immutable feeCollector;
    IUniswapV2Router02 public router;
    address public buybackManager;
    
    // Lot management
    mapping(uint256 => Lot) public lots;
    uint256 public lotHead;          // Index of first active lot
    uint256 public lotTail;          // Index for next lot
    uint256 public activeLotCount;   // Number of active lots
    
    // Take Profit configuration
    TP[] public tpLadder;
    uint256 public tpLadderSum;      // Sum of all percentBps (should equal 10000)
    
    // Oracle Price System
    uint256 public penguOraclePrice;        // Current PENGU price from backend (wei per token)
    uint256 public penguPriceLastUpdated;   // Timestamp of last price update
    uint256 public constant PRICE_STALE_TIMEOUT = 30 minutes; // Price staleness threshold
    
    // Configuration
    uint256 public maxLotsPerExecution = 10;
    bool public tpExecutionEnabled = true;
    
    // ==================== EVENTS ====================
    
    event PenguDeposited(
        uint256 indexed lotId,
        uint256 amountPengu,
        uint256 ethSpent,
        uint256 avgPriceWeiPerPengu
    );
    
    event TPLadderUpdated(TP[] ladder, uint256 totalBps);
    
    event TPExecuted(
        uint256 indexed lotId,
        uint256 amountSold,
        uint256 ethReceived,
        uint256 priceAtSale
    );
    
    event LotProcessed(
        uint256 indexed lotId,
        uint256 remainingAmount,
        bool fullyProcessed
    );
    
    event ConfigUpdated(
        uint256 maxLotsPerExecution,
        bool tpExecutionEnabled
    );
    
    event BuybackTransferFailed(uint256 ethAmount, address buybackManager);

    // Oracle events
    event OraclePriceUpdated(uint256 newPrice, uint256 timestamp, address updatedBy);
    event PriceStalenessWarning(uint256 priceAge, uint256 threshold);
    
    // ==================== ERRORS ====================
    
    error ZeroAmount();
    error ZeroAddress();
    error InvalidTPLadder();
    error TPLadderSumMismatch(uint256 actual, uint256 expected);
    error LotNotActive(uint256 lotId);
    error LotNotFound(uint256 lotId);
    error TPNotTriggered(uint256 currentPrice, uint256 targetPrice);
    error MaxLotsExceeded(uint256 requested, uint256 maximum);
    error UnauthorizedCaller(address caller);
    error SwapFailed();
    error InsufficientBalance();
    error PriceStale(uint256 age, uint256 threshold);
    error PriceOutOfBounds(uint256 price, uint256 min, uint256 max);
    
    // ==================== MODIFIERS ====================
    
    modifier onlyFeeCollector() {
        if (msg.sender != feeCollector) revert UnauthorizedCaller(msg.sender);
        _;
    }
    
    modifier validLotId(uint256 lotId) {
        if (lotId >= lotTail) revert LotNotFound(lotId);
        _;
    }
    
    modifier tpEnabled() {
        require(tpExecutionEnabled, "TP execution disabled");
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(
        address _penguAddress,
        address _feeCollector,
        address _router,
        address _buybackManager,
        address _owner
    ) Ownable(_owner) {
        
        if (_penguAddress == address(0)) revert ZeroAddress();
        if (_feeCollector == address(0)) revert ZeroAddress();
        if (_router == address(0)) revert ZeroAddress();
        if (_buybackManager == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        
        penguAddress = _penguAddress;
        feeCollector = _feeCollector;
        router = IUniswapV2Router02(_router);
        buybackManager = _buybackManager;
        
        _pause(); // Start paused for safety
    }
    
    // ==================== ORACLE PRICE FUNCTIONS ====================
    
    /**
     * @notice Updates PENGU price from backend oracle
     * @param newPriceWei New price in wei per PENGU token
     */
    function updatePenguPrice(uint256 newPriceWei) external onlyOwner {
        if (newPriceWei == 0) revert PriceOutOfBounds(newPriceWei, 1, type(uint256).max);
        if (newPriceWei > 1000 ether) revert PriceOutOfBounds(newPriceWei, 0, 1000 ether);
        
        penguOraclePrice = newPriceWei;
        penguPriceLastUpdated = block.timestamp;
        
        emit OraclePriceUpdated(newPriceWei, block.timestamp, msg.sender);
    }
    
    /**
     * @notice Gets current PENGU price from oracle
     * @return Current PENGU price in wei per token
     */
    function getPenguPrice() public view returns (uint256) {
        if (penguPriceLastUpdated == 0) {
            revert PriceStale(type(uint256).max, PRICE_STALE_TIMEOUT);
        }
        
        uint256 priceAge = block.timestamp - penguPriceLastUpdated;
        if (priceAge > PRICE_STALE_TIMEOUT) {
            revert PriceStale(priceAge, PRICE_STALE_TIMEOUT);
        }
        return penguOraclePrice;
    }
    
    /**
     * @notice Checks if oracle price is fresh
     * @return True if price is within staleness threshold
     */
    function isPriceFresh() public view returns (bool) {
        // If price was never set, it's not fresh
        if (penguPriceLastUpdated == 0) {
            return false;
        }
        return block.timestamp <= penguPriceLastUpdated + PRICE_STALE_TIMEOUT;
    }
    
    /**
     * @notice Gets oracle price info
     * @return price Current price in wei
     * @return lastUpdated Timestamp of last update
     * @return isFresh Whether price is fresh
     * @return age Price age in seconds
     */
    function getOraclePriceInfo() external view returns (
        uint256 price,
        uint256 lastUpdated,
        bool isFresh,
        uint256 age
    ) {
        price = penguOraclePrice;
        lastUpdated = penguPriceLastUpdated;
        
        if (penguPriceLastUpdated == 0) {
            age = type(uint256).max;
            isFresh = false;
        } else {
            age = block.timestamp - penguPriceLastUpdated;
            isFresh = age <= PRICE_STALE_TIMEOUT;
        }
    }
    
    // ==================== CORE FUNCTIONS ====================
    
    /**
     * @notice Deposit PENGU tokens from FeeCollector
     * @param amountPengu Amount of PENGU tokens to deposit
     * @param ethSpent Amount of ETH spent to acquire these tokens
     */
    function depositPengu(uint256 amountPengu, uint256 ethSpent) 
        external 
        onlyFeeCollector 
        whenNotPaused 
        nonReentrant 
    {
        if (amountPengu == 0) revert ZeroAmount();
        if (ethSpent == 0) revert ZeroAmount();
        
        // Transfer PENGU tokens from FeeCollector
        require(
            IERC20(penguAddress).transferFrom(msg.sender, address(this), amountPengu),
            "Transfer failed"
        );
        
        // Calculate average price
        uint256 avgPrice = (ethSpent * PRICE_PRECISION) / amountPengu;
        
        // Create new lot
        lots[lotTail] = Lot({
            amountPengu: amountPengu,
            ethSpent: ethSpent,
            avgPriceWeiPerPengu: avgPrice,
            timestamp: block.timestamp,
            active: true
        });
        
        // Update counters
        uint256 lotId = lotTail;
        lotTail++;
        activeLotCount++;
        
        emit PenguDeposited(lotId, amountPengu, ethSpent, avgPrice);
    }
    
    /**
     * @notice Set take profit ladder configuration
     * @param ladder Array of TP levels
     */
    function setTPLadder(TP[] memory ladder) external onlyOwner {
        if (ladder.length == 0) revert InvalidTPLadder();
        if (ladder.length > MAX_TP_LEVELS) revert InvalidTPLadder();
        
        // Clear existing ladder
        delete tpLadder;
        
        uint256 totalBps = 0;
        for (uint i = 0; i < ladder.length; i++) {
            if (ladder[i].multiplierX1000 <= 1000) revert InvalidTPLadder(); // Must be > 1.0x
            if (ladder[i].percentBps == 0) revert InvalidTPLadder();
            
            tpLadder.push(ladder[i]);
            totalBps += ladder[i].percentBps;
        }
        
        if (totalBps != BPS_DENOMINATOR) {
            revert TPLadderSumMismatch(totalBps, BPS_DENOMINATOR);
        }
        
        tpLadderSum = totalBps;
        emit TPLadderUpdated(ladder, totalBps);
    }
    
    /**
     * @notice Check and execute take profit for specific lot
     * @param lotId ID of the lot to check
     */
    function checkAndExecuteTP(uint256 lotId) 
        external 
        validLotId(lotId)
        whenNotPaused 
        nonReentrant 
        tpEnabled
    {
        Lot storage lot = lots[lotId];
        if (!lot.active) revert LotNotActive(lotId);
        
        uint256 currentPrice = getPenguPrice();
        
        // Process TP ladder
        _processTPLadder(lotId, lot, currentPrice);
    }
    
    /**
     * @notice Batch process multiple lots for TP execution
     * @param maxLots Maximum number of lots to process
     */
    function batchProcessTP(uint256 maxLots) 
        external 
        whenNotPaused 
        nonReentrant 
        tpEnabled
    {
        if (maxLots > MAX_LOTS_PER_CALL) {
            revert MaxLotsExceeded(maxLots, MAX_LOTS_PER_CALL);
        }
        
        uint256 currentPrice = getPenguPrice();
        uint256 processed = 0;
        uint256 currentLot = lotHead;
        
        while (processed < maxLots && currentLot < lotTail && activeLotCount > 0) {
            Lot storage lot = lots[currentLot];
            
            if (lot.active) {
                _processTPLadder(currentLot, lot, currentPrice);
                processed++;
            }
            
            currentLot++;
            
            // Update head pointer if current lot was fully processed
            if (currentLot > lotHead && !lots[lotHead].active) {
                _advanceHead();
            }
        }
    }
    
    /**
     * @dev Internal function to process TP ladder for a lot
     */
    function _processTPLadder(uint256 lotId, Lot storage lot, uint256 currentPrice) internal {
        uint256 originalAmount = lot.amountPengu;
        bool anyExecuted = false;
        
        // Check each TP level
        for (uint i = 0; i < tpLadder.length; i++) {
            TP memory tp = tpLadder[i];
            uint256 targetPrice = (lot.avgPriceWeiPerPengu * tp.multiplierX1000) / 1000;
            
            if (currentPrice >= targetPrice && lot.amountPengu > 0) {
                // Calculate amount to sell for this TP level
                uint256 amountToSell = (originalAmount * tp.percentBps) / BPS_DENOMINATOR;
                
                // Don't sell more than available
                if (amountToSell > lot.amountPengu) {
                    amountToSell = lot.amountPengu;
                }
                
                if (amountToSell > 0) {
                    uint256 ethReceived = _sellPengu(amountToSell);
                    lot.amountPengu -= amountToSell;
                    anyExecuted = true;
                    
                    emit TPExecuted(lotId, amountToSell, ethReceived, currentPrice);
                }
            }
        }
        
        // Mark lot as inactive if fully processed
        if (lot.amountPengu == 0) {
            lot.active = false;
            activeLotCount--;
        }
        
        if (anyExecuted) {
            emit LotProcessed(lotId, lot.amountPengu, !lot.active);
        }
    }
    
    /**
     * @dev Sell PENGU tokens for ETH via DEX
     * @param amount Amount of PENGU to sell
     * @return ethReceived Amount of ETH received
     */
    function _sellPengu(uint256 amount) internal returns (uint256 ethReceived) {
    if (amount == 0) return 0;

    uint256 ethBalanceBefore = address(this).balance;

    // Build swap path
    address[] memory path = new address[](2);
    path[0] = penguAddress;
    path[1] = router.WETH();

    // Approve router
    IERC20(penguAddress).approve(address(router), amount);

    try router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        amount,
        0, // Accept any amount of ETH
        path,
        address(this),
        block.timestamp + MAX_DEADLINE_BUFFER
    ) {
        ethReceived = address(this).balance - ethBalanceBefore;
        
        // Send ETH to BuybackManager
        if (ethReceived > 0) {
            try IBuybackManager(buybackManager).receiveFromStrategy{value: ethReceived}(tx.origin) {
                // Success - ETH transferred to BuybackManager
            } catch {
                // If BuybackManager call fails, keep ETH on this contract
                // This prevents the entire transaction from reverting
                emit BuybackTransferFailed(ethReceived, buybackManager);
            }
        }
    } catch {
        // Reset approval on failure
        IERC20(penguAddress).approve(address(router), 0);
        revert SwapFailed();
    }
}
    
    /**
     * @dev Advance head pointer to next active lot
     */
    function _advanceHead() internal {
        while (lotHead < lotTail && !lots[lotHead].active) {
            lotHead++;
        }
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get lot information
     * @param lotId ID of the lot
     * @return lot Lot structure
     */
    function getLot(uint256 lotId) external view validLotId(lotId) returns (Lot memory) {
        return lots[lotId];
    }
    
    /**
     * @notice Get current TP ladder
     * @return Array of TP levels
     */
    function getTPLadder() external view returns (TP[] memory) {
        return tpLadder;
    }
    
    /**
     * @notice Get contract statistics
     * @return totalLots Total number of lots created
     * @return activeLots Number of active lots
     * @return headPointer Current head pointer
     * @return tailPointer Current tail pointer
     * @return penguBalance Total PENGU balance
     * @return tpLevels Number of TP levels configured
     * @return currentPrice Current PENGU price from oracle
     */
    function getStats() external view returns (
        uint256 totalLots,
        uint256 activeLots,
        uint256 headPointer,
        uint256 tailPointer,
        uint256 penguBalance,
        uint256 tpLevels,
        uint256 currentPrice
    ) {
        totalLots = lotTail;
        activeLots = activeLotCount;
        headPointer = lotHead;
        tailPointer = lotTail;
        penguBalance = IERC20(penguAddress).balanceOf(address(this));
        tpLevels = tpLadder.length;
        currentPrice = isPriceFresh() ? penguOraclePrice : 0;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Update router address
     * @param newRouter New router address
     */
    function setRouter(address newRouter) external onlyOwner {
        if (newRouter == address(0)) revert ZeroAddress();
        router = IUniswapV2Router02(newRouter);
    }
    
    /**
     * @notice Update buyback manager address
     * @param newBuybackManager New buyback manager address
     */
    function setBuybackManager(address newBuybackManager) external onlyOwner {
        if (newBuybackManager == address(0)) revert ZeroAddress();
        buybackManager = newBuybackManager;
    }
    
    /**
     * @notice Update configuration parameters
     * @param _maxLotsPerExecution Maximum lots per execution
     * @param _tpExecutionEnabled Whether TP execution is enabled
     */
    function updateConfig(
        uint256 _maxLotsPerExecution,
        bool _tpExecutionEnabled
    ) external onlyOwner {
        if (_maxLotsPerExecution > MAX_LOTS_PER_CALL) {
            revert MaxLotsExceeded(_maxLotsPerExecution, MAX_LOTS_PER_CALL);
        }
        
        maxLotsPerExecution = _maxLotsPerExecution;
        tpExecutionEnabled = _tpExecutionEnabled;
        
        emit ConfigUpdated(_maxLotsPerExecution, _tpExecutionEnabled);
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ==================== EMERGENCY FUNCTIONS ====================
    
    /**
     * @notice Emergency withdrawal of ETH
     * @param amount Amount to withdraw (0 = all)
     */
    function emergencyWithdrawETH(uint256 amount) external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InsufficientBalance();
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        if (withdrawAmount > balance) revert InsufficientBalance();
        
        (bool success, ) = owner().call{value: withdrawAmount}("");
        require(success, "ETH withdrawal failed");
    }
    
    /**
     * @notice Emergency withdrawal of tokens
     * @param token Token address
     * @param amount Amount to withdraw (0 = all)
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        if (balance == 0) revert InsufficientBalance();
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        if (withdrawAmount > balance) revert InsufficientBalance();
        
        require(tokenContract.transfer(owner(), withdrawAmount), "Token withdrawal failed");
    }
    
    /**
     * @notice Force set lot as inactive (emergency)
     * @param lotId ID of lot to deactivate
     */
    function emergencyDeactivateLot(uint256 lotId) external onlyOwner validLotId(lotId) {
        Lot storage lot = lots[lotId];
        if (lot.active) {
            lot.active = false;
            activeLotCount--;
        }
    }
    
    // ==================== FALLBACK ====================
    
    receive() external payable {
        // Accept ETH
    }
}