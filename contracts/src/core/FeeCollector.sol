
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for Uniswap V2 Router
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    
    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

// Interface for StrategyCore contract
interface IStrategyCore {
    function depositPengu(uint256 amountPengu, uint256 ethSpent) external;
}

// Interface for Treasury contract  
interface ITreasury {
    function depositPengu(uint256 amount) external;
}

/**
 * @title FeeCollector
 * @dev Collects ETH from StratToken, buys PENGU tokens, and distributes them
 * @notice This contract accumulates ETH and converts it to PENGU for the ecosystem
 */
contract FeeCollector is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ CUSTOM ERRORS ============
    error InsufficientBalance();
    error InvalidThreshold();
    error InvalidUseAmount();
    error InvalidAddress();
    error InvalidDistributionRatio();
    error SwapFailed();
    error InsufficientTokensReceived();
    error TransferFailed();
    error InvalidDeadline();
    error ZeroAmount();
    error SlippageTooHigh();

    // ============ EVENTS ============
    event ETHReceived(address indexed from, uint256 amount);
    event FeeProcessed(
        uint256 ethUsed,
        uint256 penguReceived,
        uint256 toStrategy,
        uint256 toTreasury
    );
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event UseAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event RouterUpdated(address indexed oldRouter, address indexed newRouter);
    event StrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // ============ STATE VARIABLES ============
    
    // Core addresses
    address public penguAddress;
    IUniswapV2Router02 public router;
    IStrategyCore public strategyCore;
    ITreasury public treasury;
    
    // Configuration parameters
    uint256 public threshold = 1 ether;           // Minimum ETH to trigger processFees
    uint256 public useAmount = 0.9 ether;         // Amount to use per process
    
    // Distribution ratios (basis points)
    uint256 public constant STRATEGY_RATIO = 7000;    // 70%
    uint256 public constant TREASURY_RATIO = 3000;    // 30%
    uint256 public constant BPS_DENOM = 10000;        // 100%
    
    // Constants
    uint256 private constant MAX_DEADLINE_BUFFER = 20 minutes;
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Initialize FeeCollector with required addresses and parameters
     * @param _penguAddress Address of PENGU token contract
     * @param _router Address of Uniswap V2 router
     * @param _strategyCore Address of StrategyCore contract
     * @param _treasury Address of Treasury contract
     * @param _owner Address of contract owner (multisig)
     */
    constructor(
        address _penguAddress,
        address _router,
        address _strategyCore,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_penguAddress == address(0)) revert InvalidAddress();
        if (_router == address(0)) revert InvalidAddress();
        if (_strategyCore == address(0)) revert InvalidAddress();
        if (_treasury == address(0)) revert InvalidAddress();
        if (_owner == address(0)) revert InvalidAddress();
        
        penguAddress = _penguAddress;
        router = IUniswapV2Router02(_router);
        strategyCore = IStrategyCore(_strategyCore);
        treasury = ITreasury(_treasury);
        
        // Validate distribution ratios
        if (STRATEGY_RATIO + TREASURY_RATIO != BPS_DENOM) {
            revert InvalidDistributionRatio();
        }
    }
    
    // ============ RECEIVE FUNCTIONS ============
    
    /**
     * @dev Receive ETH from any source
     */
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    /**
     * @dev Explicit function for receiving ETH from StratToken
     */
    function receiveETH() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @dev Process fees with automatic slippage calculation
     * @param slippageBps Slippage tolerance in basis points (e.g., 300 = 3%)
     */
        function processFeesWithSlippage(uint256 slippageBps) external nonReentrant {

        if (slippageBps > 1500) revert SlippageTooHigh();
        
        uint256 currentBalance = address(this).balance;
        if (currentBalance < threshold) {
            revert InsufficientBalance();
        }

        uint256 ethToUse = useAmount > currentBalance ? currentBalance : useAmount;
        if (ethToUse == 0) {
            revert ZeroAmount();
        }

        // Calculate minimum tokens out based on current price and slippage
        uint256 minTokensOut = _calculateMinTokensOut(ethToUse, slippageBps);

        // Execute the swap
        uint256 penguReceived = _swapETHForPengu(ethToUse, minTokensOut);

        // Distribute PENGU tokens
        _distributePengu(penguReceived, ethToUse);

        emit FeeProcessed(ethToUse, penguReceived,
            (penguReceived * STRATEGY_RATIO) / BPS_DENOM,
            (penguReceived * TREASURY_RATIO) / BPS_DENOM
        );
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Swap ETH for PENGU tokens via Uniswap
     * @param ethAmount Amount of ETH to swap
     * @param minTokensOut Minimum tokens expected
     * @return penguReceived Amount of PENGU tokens received
     */
    function _swapETHForPengu(uint256 ethAmount, uint256 minTokensOut) 
        internal 
        returns (uint256 penguReceived) 
    {
        // Build swap path: WETH -> PENGU
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = penguAddress;
        
        // Record PENGU balance before swap
        uint256 balanceBefore = IERC20(penguAddress).balanceOf(address(this));
        
        try router.swapExactETHForTokensSupportingFeeOnTransferTokens{value: ethAmount}(
            minTokensOut,
            path,
            address(this),
            block.timestamp + MAX_DEADLINE_BUFFER
        ) {
            // Calculate actual tokens received
            uint256 balanceAfter = IERC20(penguAddress).balanceOf(address(this));
            penguReceived = balanceAfter - balanceBefore;
            
            // Verify minimum amount received
            if (penguReceived < minTokensOut) {
                revert InsufficientTokensReceived();
            }
        } catch {
            revert SwapFailed();
        }
    }
    
    /**
     * @dev Distribute PENGU tokens to StrategyCore and Treasury
     * @param totalAmount Total PENGU amount to distribute
     * @param ethSpent Amount of ETH spent for this PENGU purchase
     */
    function _distributePengu(uint256 totalAmount, uint256 ethSpent) internal {
        // Calculate distribution amounts
        uint256 toStrategy = (totalAmount * STRATEGY_RATIO) / BPS_DENOM;
        uint256 toTreasury = totalAmount - toStrategy; // Remaining amount

        IERC20 pengu = IERC20(penguAddress);

        // Send to StrategyCore with eth spent info
        if (toStrategy > 0) {
            try pengu.transfer(address(strategyCore), toStrategy) {
                try strategyCore.depositPengu(toStrategy, (ethSpent * STRATEGY_RATIO) / BPS_DENOM) {
                    // Success
                } catch {
                    // StrategyCore deposit failed but tokens already transferred
                    revert("StrategyCore deposit failed");
                }
            } catch {
                revert TransferFailed();
            }
        }

        // Send to Treasury
        if (toTreasury > 0) {
            try pengu.transfer(address(treasury), toTreasury) {
                try treasury.depositPengu(toTreasury) {
                    // Success
                } catch {
                    // Treasury deposit failed but tokens already transferred
                    revert("Treasury deposit failed");
                }
            } catch {
                revert TransferFailed();
            }
        }
    }
    
    /**
     * @dev Calculate minimum tokens out based on current price and slippage
     * @param ethAmount ETH amount to swap
     * @param slippageBps Slippage in basis points
     * @return minTokensOut Minimum expected tokens
     */
    function _calculateMinTokensOut(uint256 ethAmount, uint256 slippageBps) 
        internal 
        view 
        returns (uint256 minTokensOut) 
    {
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = penguAddress;
        
        try router.getAmountsOut(ethAmount, path) returns (uint[] memory amounts) {
            uint256 expectedTokens = amounts[1];
            minTokensOut = (expectedTokens * (BPS_DENOM - slippageBps)) / BPS_DENOM;
        } catch {
            // Fallback to 0 if price lookup fails
            minTokensOut = 0;
        }
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Set processing threshold
     * @param _threshold New threshold in wei
     */
    function setThreshold(uint256 _threshold) external onlyOwner {
        if (_threshold == 0) revert InvalidThreshold();
        
        uint256 oldThreshold = threshold;
        threshold = _threshold;
        
        emit ThresholdUpdated(oldThreshold, _threshold);
    }
    
    /**
     * @dev Set use amount per processing
     * @param _useAmount New use amount in wei
     */
    function setUseAmount(uint256 _useAmount) external onlyOwner {
        if (_useAmount == 0) revert InvalidUseAmount();
        
        uint256 oldAmount = useAmount;
        useAmount = _useAmount;
        
        emit UseAmountUpdated(oldAmount, _useAmount);
    }
    
    /**
     * @dev Update Uniswap router address
     * @param _router New router address
     */
    function setRouter(address _router) external onlyOwner {
        if (_router == address(0)) revert InvalidAddress();
        
        address oldRouter = address(router);
        router = IUniswapV2Router02(_router);
        
        emit RouterUpdated(oldRouter, _router);
    }
    
    /**
     * @dev Update StrategyCore contract address
     * @param _strategyCore New StrategyCore address
     */
    function setStrategyCore(address _strategyCore) external onlyOwner {
        if (_strategyCore == address(0)) revert InvalidAddress();
        
        address oldStrategy = address(strategyCore);
        strategyCore = IStrategyCore(_strategyCore);
        
        emit StrategyUpdated(oldStrategy, _strategyCore);
    }
    
    /**
     * @dev Update Treasury contract address
     * @param _treasury New Treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        
        address oldTreasury = address(treasury);
        treasury = ITreasury(_treasury);
        
        emit TreasuryUpdated(oldTreasury, _treasury);
    }
    
    /**
     * @dev Update PENGU token address
     * @param _penguAddress New PENGU token address
     */
    function setPenguAddress(address _penguAddress) external onlyOwner {
        if (_penguAddress == address(0)) revert InvalidAddress();
        penguAddress = _penguAddress;
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @dev Emergency withdraw ETH
     * @param amount Amount to withdraw (0 = all)
     */
    function emergencyWithdrawETH(uint256 amount) external onlyOwner {
        uint256 balance = address(this).balance;
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        
        if (withdrawAmount > balance) {
            withdrawAmount = balance;
        }
        
        (bool success, ) = payable(owner()).call{value: withdrawAmount}("");
        if (!success) revert TransferFailed();
        
        emit EmergencyWithdraw(address(0), withdrawAmount);
    }
    
    /**
     * @dev Emergency withdraw any ERC20 token
     * @param token Token address to withdraw
     * @param amount Amount to withdraw (0 = all)
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert InvalidAddress();
        
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        
        if (withdrawAmount > balance) {
            withdrawAmount = balance;
        }
        
        tokenContract.safeTransfer(owner(), withdrawAmount);
        
        emit EmergencyWithdraw(token, withdrawAmount);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Check if processing can be triggered
     * @return canProcessNow True if threshold is met
     * @return availableAmount Amount available for processing
     */
    function canProcess() external view returns (bool canProcessNow, uint256 availableAmount) {
        uint256 currentBalance = address(this).balance;
        canProcessNow = currentBalance >= threshold;
        
        if (canProcessNow) {
            availableAmount = useAmount > currentBalance ? currentBalance : useAmount;
        }
    }
    
    /**
     * @dev Get current contract configuration
     * @return _threshold Current threshold value
     * @return _useAmount Current use amount
     * @return _penguAddress PENGU token address
     * @return _router Router address
     * @return _strategyCore StrategyCore address  
     * @return _treasury Treasury address
     */
    function getConfig() external view returns (
        uint256 _threshold,
        uint256 _useAmount,
        address _penguAddress,
        address _router,
        address _strategyCore,
        address _treasury
    ) {
        return (
            threshold,
            useAmount,
            penguAddress,
            address(router),
            address(strategyCore),
            address(treasury)
        );
    }
    
    /**
     * @dev Get expected PENGU tokens for ETH amount
     * @param ethAmount ETH amount to check
     * @return expectedTokens Expected PENGU tokens (may be 0 if price lookup fails)
     */
    function getExpectedTokens(uint256 ethAmount) external view returns (uint256 expectedTokens) {
        if (ethAmount == 0) return 0;
        
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = penguAddress;
        
        try router.getAmountsOut(ethAmount, path) returns (uint[] memory amounts) {
            expectedTokens = amounts[1];
        } catch {
            expectedTokens = 0;
        }
    }
}

