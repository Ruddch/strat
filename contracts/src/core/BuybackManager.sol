// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IUniswapV2Router02.sol";

// Interface for burnable tokens
interface IBurnableToken is IERC20 {
    function burn(uint256 amount) external;
}

/**
 * @title BuybackManager
 * @dev Automatically buys back and burns STRAT tokens using ETH from StrategyCore
 */
contract BuybackManager is Ownable, Pausable, ReentrancyGuard {
    
    // ==================== CONSTANTS ====================
    
    uint256 public constant MAX_SLIPPAGE_BPS = 500;           // 5% max slippage
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MAX_CALLER_REWARD_BPS = 100;      // 1% max caller reward
    uint256 public constant MIN_BUYBACK_THRESHOLD = 0.001 ether;  // Minimum 0.001 ETH
    uint256 public constant MAX_BUYBACK_THRESHOLD = 100 ether;    // Maximum 100 ETH
    uint256 public constant MAX_DEADLINE_BUFFER = 300;        // 5 minutes
    
    // ==================== STATE VARIABLES ====================
    
    // Core addresses
    address public immutable stratTokenAddress;
    address public immutable strategyCore;
    IUniswapV2Router02 public router;
    
    // Configuration
    uint256 public buybackThreshold = 0.01 ether;       // Minimum ETH to trigger buyback
    uint256 public slippageBps = 300;                   // 3% slippage tolerance
    uint256 public callerRewardBps = 50;                // 0.5% caller reward
    bool public autoBuybackEnabled = true;              // Auto buyback on receive
    
    // Statistics
    uint256 public totalETHReceived;                    // Total ETH received from StrategyCore
    uint256 public totalETHUsedForBuyback;              // Total ETH used for buybacks
    uint256 public totalSTRATBurned;                    // Total STRAT tokens burned
    uint256 public totalBuybacks;                       // Number of buybacks executed
    uint256 public totalCallerRewards;                  // Total rewards paid to callers
    
    // Pending ETH for buyback
    uint256 public pendingETH;                          // ETH waiting to reach threshold
    
    // ==================== EVENTS ====================
    
    event ETHReceived(
        address indexed from,
        uint256 amount,
        uint256 newPendingTotal,
        uint256 timestamp
    );
    
    event BuybackExecuted(
        address indexed caller,
        uint256 ethUsed,
        uint256 stratReceived,
        uint256 stratBurned,
        uint256 callerReward,
        uint256 timestamp
    );
    
    event BuybackThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event SlippageUpdated(uint256 oldSlippage, uint256 newSlippage);
    event CallerRewardUpdated(uint256 oldReward, uint256 newReward);
    event AutoBuybackToggled(bool enabled);
    event RouterUpdated(address oldRouter, address newRouter);
    
    event BuybackFailed(
        string reason,
        uint256 ethAmount,
        address caller,
        uint256 timestamp
    );
    
    // ==================== ERRORS ====================
    
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientETH(uint256 available, uint256 required);
    error SlippageTooHigh(uint256 provided, uint256 maximum);
    error CallerRewardTooHigh(uint256 provided, uint256 maximum);
    error ThresholdOutOfBounds(uint256 provided, uint256 min, uint256 max);
    error UnauthorizedCaller(address caller);
    error BuybackDisabled();
    error SwapFailed(string reason);
    error BurnFailed(uint256 amount);
    
    // ==================== MODIFIERS ====================
    
    modifier onlyStrategyCore() {
        if (msg.sender != strategyCore) revert UnauthorizedCaller(msg.sender);
        _;
    }
    
    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(
        address _stratTokenAddress,
        address _strategyCore,
        address _router,
        address _owner
    ) Ownable(_owner) validAddress(_stratTokenAddress) validAddress(_strategyCore) validAddress(_router) validAddress(_owner) {
        stratTokenAddress = _stratTokenAddress;
        strategyCore = _strategyCore;
        router = IUniswapV2Router02(_router);
        
        // Start unpaused for immediate operation
    }
    
    // ==================== MAIN FUNCTIONS ====================
    
    /**
     * @notice Receive ETH from StrategyCore and trigger buyback if threshold reached
     * @param caller Address that will receive caller reward
     */
    function receiveFromStrategy(address caller) 
        external 
        payable 
        onlyStrategyCore 
        whenNotPaused 
        nonReentrant 
    {
        if (msg.value == 0) revert ZeroAmount();
        
        uint256 ethReceived = msg.value;
        pendingETH += ethReceived;
        totalETHReceived += ethReceived;
        
        emit ETHReceived(msg.sender, ethReceived, pendingETH, block.timestamp);
        
        // Auto buyback if enabled and threshold reached
        if (autoBuybackEnabled && pendingETH >= buybackThreshold) {
            _executeBuyback(caller);
        }
    }
    
    /**
     * @notice Manually trigger buyback (callable by anyone)
     * @dev Caller receives reward for gas compensation
     */
    function triggerBuyback() 
        external 
        whenNotPaused 
        nonReentrant 
    {
        if (pendingETH < buybackThreshold) {
            revert InsufficientETH(pendingETH, buybackThreshold);
        }
        
        _executeBuyback(msg.sender);
    }
    
    /**
     * @dev Internal function to execute buyback
     * @param caller Address to receive caller reward
     */
    function _executeBuyback(address caller) internal {
        uint256 ethToUse = pendingETH;
        if (ethToUse < buybackThreshold) return;

        uint256 callerReward = (ethToUse * callerRewardBps) / BPS_DENOMINATOR;
        uint256 ethForBuyback = ethToUse - callerReward;

        try this._performSwapAndBurn(ethForBuyback) returns (uint256 stratBurned) {
            // Reset pending ETH only after successful swap
            pendingETH = 0;
            
            totalETHUsedForBuyback += ethForBuyback;
            totalSTRATBurned += stratBurned;
            totalBuybacks++;
            totalCallerRewards += callerReward;

            if (callerReward > 0 && caller != address(0)) {
                (bool success, ) = payable(caller).call{value: callerReward}("");
                if (!success) {
                    pendingETH += callerReward;
                    callerReward = 0;
                }
            }

            emit BuybackExecuted(
                caller,
                ethForBuyback,
                stratBurned,
                stratBurned,
                callerReward,
                block.timestamp
            );

        } catch Error(string memory reason) {
            emit BuybackFailed(reason, ethForBuyback, caller, block.timestamp);
        } catch {
            emit BuybackFailed("Unknown error", ethForBuyback, caller, block.timestamp);
        }
    }
    
    /**
     * @dev External function for try/catch - performs swap and burn
     * @param ethAmount Amount of ETH to use for buyback
     * @return stratBurned Amount of STRAT tokens burned
     */
    function _performSwapAndBurn(uint256 ethAmount) external returns (uint256 stratBurned) {
        // This function should only be called by this contract
        require(msg.sender == address(this), "Internal function");
        
        if (ethAmount == 0) revert ZeroAmount();
        
        // Get expected STRAT output
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = stratTokenAddress;
        
        uint[] memory amounts = router.getAmountsOut(ethAmount, path);
        uint256 expectedSTRAT = amounts[1];
        
        // Calculate minimum STRAT with slippage
        uint256 minSTRAT = (expectedSTRAT * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
        
        // Record STRAT balance before swap
        uint256 stratBalanceBefore = IERC20(stratTokenAddress).balanceOf(address(this));
        
        // Perform swap
        router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: ethAmount}(
            minSTRAT,
            path,
            address(this),
            block.timestamp + MAX_DEADLINE_BUFFER
        );
        
        // Calculate actual STRAT received (handles fee-on-transfer)
        uint256 stratBalanceAfter = IERC20(stratTokenAddress).balanceOf(address(this));
        uint256 stratReceived = stratBalanceAfter - stratBalanceBefore;
        
        if (stratReceived == 0) revert SwapFailed("No tokens received");
        
        // Burn all received STRAT tokens
        try IBurnableToken(stratTokenAddress).burn(stratReceived) {
            stratBurned = stratReceived;
        } catch {
            // If burn fails, try transfer to dead address
            bool success = IERC20(stratTokenAddress).transfer(address(0xdead), stratReceived);
            if (!success) revert BurnFailed(stratReceived);
            stratBurned = stratReceived;
        }
        
        return stratBurned;
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get expected STRAT output for ETH input
     * @param ethAmount Amount of ETH to check
     * @return expectedSTRAT Expected STRAT tokens
     * @return minSTRAT Minimum STRAT with slippage
     */
    function getExpectedSTRAT(uint256 ethAmount) 
        external 
        view 
        returns (uint256 expectedSTRAT, uint256 minSTRAT) 
    {
        if (ethAmount == 0) return (0, 0);
        
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = stratTokenAddress;
        
        try router.getAmountsOut(ethAmount, path) returns (uint[] memory amounts) {
            expectedSTRAT = amounts[1];
            minSTRAT = (expectedSTRAT * (BPS_DENOMINATOR - slippageBps)) / BPS_DENOMINATOR;
        } catch {
            return (0, 0);
        }
    }
    
    /**
     * @notice Check if buyback can be triggered
     * @return canTrigger Whether buyback can be executed
     * @return ethAvailable Available ETH for buyback
     * @return ethNeeded ETH needed to reach threshold
     */
    function canTriggerBuyback() 
        external 
        view 
        returns (bool canTrigger, uint256 ethAvailable, uint256 ethNeeded) 
    {
        ethAvailable = pendingETH;
        canTrigger = ethAvailable >= buybackThreshold && !paused();
        ethNeeded = canTrigger ? 0 : buybackThreshold - ethAvailable;
    }
    
    /**
     * @notice Get contract statistics
     * @return _totalETHReceived Total ETH received from StrategyCore
     * @return _totalETHUsedForBuyback Total ETH used for buybacks
     * @return _totalSTRATBurned Total STRAT tokens burned
     * @return _totalBuybacks Number of buybacks executed
     * @return _totalCallerRewards Total rewards paid to callers
     * @return _pendingETH ETH waiting to reach threshold
     * @return _contractETHBalance Current contract ETH balance
     */
    function getStats() external view returns (
        uint256 _totalETHReceived,
        uint256 _totalETHUsedForBuyback,
        uint256 _totalSTRATBurned,
        uint256 _totalBuybacks,
        uint256 _totalCallerRewards,
        uint256 _pendingETH,
        uint256 _contractETHBalance
    ) {
        return (
            totalETHReceived,
            totalETHUsedForBuyback,
            totalSTRATBurned,
            totalBuybacks,
            totalCallerRewards,
            pendingETH,
            address(this).balance
        );
    }
    
    /**
     * @notice Get current configuration
     * @return _buybackThreshold Minimum ETH threshold for buyback
     * @return _slippageBps Slippage tolerance in basis points
     * @return _callerRewardBps Caller reward percentage in basis points
     * @return _autoBuybackEnabled Whether auto buyback is enabled
     * @return _router Uniswap router address
     */
    function getConfig() external view returns (
        uint256 _buybackThreshold,
        uint256 _slippageBps,
        uint256 _callerRewardBps,
        bool _autoBuybackEnabled,
        address _router
    ) {
        return (
            buybackThreshold,
            slippageBps,
            callerRewardBps,
            autoBuybackEnabled,
            address(router)
        );
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @notice Update buyback threshold
     * @param newThreshold New minimum ETH threshold
     */
    function setBuybackThreshold(uint256 newThreshold) external onlyOwner {
        if (newThreshold < MIN_BUYBACK_THRESHOLD || newThreshold > MAX_BUYBACK_THRESHOLD) {
            revert ThresholdOutOfBounds(newThreshold, MIN_BUYBACK_THRESHOLD, MAX_BUYBACK_THRESHOLD);
        }
        
        uint256 oldThreshold = buybackThreshold;
        buybackThreshold = newThreshold;
        
        emit BuybackThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /**
     * @notice Update slippage tolerance
     * @param newSlippageBps New slippage in basis points
     */
    function setSlippage(uint256 newSlippageBps) external onlyOwner {
        if (newSlippageBps > MAX_SLIPPAGE_BPS) {
            revert SlippageTooHigh(newSlippageBps, MAX_SLIPPAGE_BPS);
        }
        
        uint256 oldSlippage = slippageBps;
        slippageBps = newSlippageBps;
        
        emit SlippageUpdated(oldSlippage, newSlippageBps);
    }
    
    /**
     * @notice Update caller reward percentage
     * @param newRewardBps New caller reward in basis points
     */
    function setCallerReward(uint256 newRewardBps) external onlyOwner {
        if (newRewardBps > MAX_CALLER_REWARD_BPS) {
            revert CallerRewardTooHigh(newRewardBps, MAX_CALLER_REWARD_BPS);
        }
        
        uint256 oldReward = callerRewardBps;
        callerRewardBps = newRewardBps;
        
        emit CallerRewardUpdated(oldReward, newRewardBps);
    }
    
    /**
     * @notice Toggle auto buyback functionality
     * @param enabled Whether auto buyback should be enabled
     */
    function setAutoBuyback(bool enabled) external onlyOwner {
        autoBuybackEnabled = enabled;
        emit AutoBuybackToggled(enabled);
    }
    
    /**
     * @notice Update Uniswap router
     * @param newRouter New router address
     */
    function setRouter(address newRouter) external onlyOwner validAddress(newRouter) {
        address oldRouter = address(router);
        router = IUniswapV2Router02(newRouter);
        
        emit RouterUpdated(oldRouter, newRouter);
    }
    
    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract operations
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
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        
        if (withdrawAmount > balance) {
            revert InsufficientETH(balance, withdrawAmount);
        }
        
        // Reset pending ETH if withdrawing
        if (withdrawAmount > 0) {
            uint256 pendingToReset = withdrawAmount > pendingETH ? pendingETH : withdrawAmount;
            pendingETH -= pendingToReset;
        }
        
        (bool success, ) = payable(owner()).call{value: withdrawAmount}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @notice Emergency withdrawal of tokens
     * @param token Token address to withdraw
     * @param amount Amount to withdraw (0 = all)
     */
    function emergencyWithdrawToken(address token, uint256 amount) 
        external 
        onlyOwner 
        validAddress(token) 
    {
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        
        require(withdrawAmount <= balance, "Insufficient token balance");
        require(tokenContract.transfer(owner(), withdrawAmount), "Token transfer failed");
    }
    
    /**
     * @notice Force execute pending buyback (emergency)
     * @dev Ignores threshold and executes with current pending ETH
     */
    function forceExecuteBuyback() external onlyOwner whenNotPaused nonReentrant {
        if (pendingETH == 0) revert ZeroAmount();
        
        uint256 originalThreshold = buybackThreshold;
        buybackThreshold = 0; // Temporarily set to 0
        
        _executeBuyback(owner()); // Owner gets any caller reward
        
        buybackThreshold = originalThreshold; // Restore original threshold
    }
    
    // ==================== FALLBACK ====================
    
    /**
     * @notice Receive function - accepts ETH but requires it to come through receiveFromStrategy
     */
    receive() external payable {
        // Only allow ETH from StrategyCore through the proper function
        if (msg.sender != strategyCore) {
            revert UnauthorizedCaller(msg.sender);
        }
        // This should not be reached if receiveFromStrategy is used properly
        revert("Use receiveFromStrategy function");
    }
    
    /**
     * @notice Fallback function
     */
    fallback() external payable {
        revert("Function not found");
    }
}