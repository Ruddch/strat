// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function WETH() external view returns (address);
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn, 
        uint amountOutMin, 
        address[] calldata path, 
        address to, 
        uint deadline
    ) external;
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address);
}

interface IFeeCollector {
    function receiveETH() external payable;
}

contract StratToken is ERC20, Ownable, ReentrancyGuard {
    // ====== Configuration ======
    uint16 public constant MAX_FEE_BPS = 1000;        // 10% hard cap
    uint16 public constant BPS_DENOM = 10000;         // 100% in basis points
    uint16 public constant OPS_SHARE_BPS = 2000;      // 20% of ETH to ops
    uint16 public constant COLLECTOR_SHARE_BPS = 8000; // 80% of ETH to collector
    
    uint16 public totalFeeBps = 1000;                 // 10% default total fee

    address payable public opsWallet;
    address public feeCollector;
    address public buybackManager;

    IUniswapV2Router02 public router;
    address public pair;      // Uniswap V2 pair (market)
    address public WETH;

    bool public tradingEnabled = false;

    mapping(address => bool) public feeExempt;
    mapping(address => bool) public isMarket; // mark the pair (or more if needed)

    // swap-back for accumulated tokens
    bool public swapEnabled = true;
    bool private inSwap;
    uint256 public swapThreshold = 1000 * 10**18;     // 1000 tokens threshold
    uint256 public maxSwapAmount = 1000000 * 10**18;  // 1M tokens max per swap

    // anti-whale limits
    uint256 public maxWallet;          // in token wei
    uint256 public maxTx;              // in token wei
    bool    public limitsEnabled = true;

    mapping(address => bool) public limitExempt;

    // ====== Events ======
    event FeeTaken(uint256 amount, address from);
    event ImmediateSwapResult(bool success, uint256 tokensIn, uint256 ethOut, uint256 toOps, uint256 toCollector);
    event SwapBackExecuted(uint256 tokensSold, uint256 ethReceived, uint256 toOps, uint256 toCollector);
    event FeesUpdated(uint16 totalFeeBps);
    event WalletsUpdated(address indexed opsWallet, address indexed feeCollector, address indexed buybackManager);
    event MarketSet(address indexed account, bool isMarket);
    event FeeExemptSet(address indexed account, bool isExempt);
    event TradingEnabled();
    event SwapSettingsSet(uint256 threshold, uint256 maxSwap, bool enabled);
    event LimitsUpdated(uint256 maxTx, uint256 maxWallet, bool enabled);
    event LimitExemptSet(address indexed account, bool isExempt);

    // ====== Errors ======
    error TradingDisabled();
    error ZeroAddress();
    error FeeTooHigh();
    error MaxTxExceeded();
    error MaxWalletExceeded();
    error SwapFailed();
    error InvalidInput();

    modifier lockTheSwap() {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,                  // e.g. 1_000_000_000 * 1e18
        address payable opsWallet_,
        address feeCollector_,
        address buybackManager_,
        address router_                         // Router address for the network
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        if (opsWallet_ == address(0) || feeCollector_ == address(0) || router_ == address(0)) revert ZeroAddress();

        opsWallet = opsWallet_;
        feeCollector = feeCollector_;
        buybackManager = buybackManager_; // Can be zero initially

        router = IUniswapV2Router02(router_);
        WETH = router.WETH();

        // Create the V2 pair (token <-> WETH)
        pair = IUniswapV2Factory(router.factory()).createPair(address(this), WETH);
        isMarket[pair] = true;

        // Mint supply to deployer
        _mint(msg.sender, initialSupply);

        // Fee exemptions
        feeExempt[address(this)] = true;
        feeExempt[msg.sender] = true;
        feeExempt[opsWallet] = true;
        feeExempt[feeCollector] = true;
        if (buybackManager_ != address(0)) {
            feeExempt[buybackManager_] = true;
        }

        // Anti-whale limits: 3% max wallet, 1% max tx
        maxWallet = (initialSupply * 3) / 100;   // 3% of supply
        maxTx     = (initialSupply * 1) / 100;   // 1% of supply

        // Limit exemptions (DO NOT exempt the pair)
        limitExempt[owner()] = true;
        limitExempt[address(this)] = true;
        limitExempt[opsWallet] = true;
        limitExempt[feeCollector] = true;
        if (buybackManager_ != address(0)) {
            limitExempt[buybackManager_] = true;
        }
    }

    // ====== Core transfer with fees ======
    function _update(address from, address to, uint256 amount) internal override {
        // Cache state variables to save gas
        bool _tradingEnabled = tradingEnabled;
        bool _swapEnabled = swapEnabled;
        bool _inSwap = inSwap;
        uint16 _totalFeeBps = totalFeeBps;
        
        // Owner can always move pre-launch
        if (!_tradingEnabled && from != owner() && to != owner()) {
            revert TradingDisabled();
        }

        bool marketFrom = isMarket[from];
        bool marketTo   = isMarket[to];

        // Apply anti-whale limits first
        _enforceTransactionLimits(from, to, amount, marketFrom, marketTo);

        // Cache fee exemption status
        bool fromExempt = feeExempt[from];
        bool toExempt = feeExempt[to];

        // Determine if fee should be taken
        bool shouldTakeFee = _tradingEnabled
            && !fromExempt
            && !toExempt
            && (marketFrom || marketTo);

        // Execute swap-back on sells
        if (_swapEnabled && !_inSwap && marketTo && from != address(this)) {
            _swapBack();
        }

        // Process transfer with or without fees
        if (!shouldTakeFee) {
            super._update(from, to, amount);
            return;
        }

        uint256 feeAmount = (amount * _totalFeeBps) / BPS_DENOM;
        uint256 transferAmount = amount - feeAmount;

        // Transfer net amount to recipient
        super._update(from, to, transferAmount);
        super._update(from, address(this), feeAmount);

        emit FeeTaken(feeAmount, from);

        // Try immediate swap of collected fees
        if (!_inSwap) {
            _tryImmediateSwap(feeAmount);
        }
    }

    function _tryImmediateSwap(uint256 amount) private {
        if (balanceOf(address(this)) < amount) return;
        
        bool swapSuccess = false;
        uint256 ethReceived = 0;
        uint256 toOps = 0;
        uint256 toCollector = 0;

        try this._executeSwap(amount) returns (uint256 ethOut) {
            ethReceived = ethOut;
            swapSuccess = true;
            
            if (ethReceived > 0) {
                toOps = (ethReceived * OPS_SHARE_BPS) / BPS_DENOM;
                toCollector = ethReceived - toOps;
                _distributeETH(ethReceived);
            }
        } catch {

        }

        emit ImmediateSwapResult(swapSuccess, swapSuccess ? amount : 0, ethReceived, toOps, toCollector);
    }

    // try/catch swap
    function _executeSwap(uint256 tokenAmount) external lockTheSwap returns (uint256 ethOut) {
        require(msg.sender == address(this), "Only self");
        
        _approve(address(this), address(router), tokenAmount);

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;

        uint256 balanceBefore = address(this).balance;

        router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // Accept any amount of ETH
            path,
            address(this),
            block.timestamp + 300
        );

        ethOut = address(this).balance - balanceBefore;
        return ethOut;
    }

    // split ETH to ops n collector
    function _distributeETH(uint256 ethAmount) private {
        if (ethAmount == 0) return;

        uint256 toOps = (ethAmount * OPS_SHARE_BPS) / BPS_DENOM;
        uint256 toCollector = ethAmount - toOps;

        // send ETH to ops wallet
        if (toOps > 0) {
            (bool success,) = opsWallet.call{value: toOps}("");
            if (!success) revert SwapFailed();
        }

        // send ETH to fee collector
        if (toCollector > 0) {
            try IFeeCollector(feeCollector).receiveETH{value: toCollector}() {
                // Success
            } catch {
                // Fallback
                (bool success,) = feeCollector.call{value: toCollector}("");
                if (!success) revert SwapFailed();
            }
        }
    }

    // ====== Anti-whale limit enforcement ======
    function _enforceTransactionLimits(
        address from, 
        address to, 
        uint256 amount, 
        bool marketFrom, 
        bool marketTo
    ) private view {
        // Ignore internal/contract flows to avoid maxTx reverts during swapback
        if (inSwap || from == address(this) || to == address(this)) {
            return;
        }

        if (!limitsEnabled || !tradingEnabled) {
            return;
        }

        // Only skip when BOTH sides are exempt (owner<->treasury moves, etc.)
        if (limitExempt[from] && limitExempt[to]) {
            return;
        }

        // Check max transaction limit
        if (amount > maxTx) revert MaxTxExceeded();

        // Check max wallet limit for recipients (except when selling to pair)
        if (!marketTo) {
            uint256 potentialFee = 0;
            bool hasMarketFee = !feeExempt[from] && !feeExempt[to] && (marketFrom || marketTo);
            if (hasMarketFee) { 
                potentialFee = (amount * totalFeeBps) / BPS_DENOM;
            }
            uint256 finalAmount = amount - potentialFee;
            if (balanceOf(to) + finalAmount > maxWallet) revert MaxWalletExceeded();
        }
    }

    // Swap-back
    function _swapBack() private lockTheSwap nonReentrant {
        uint256 tokenBal = balanceOf(address(this));
        if (tokenBal < swapThreshold) return;

        uint256 amountToSwap = tokenBal > maxSwapAmount ? maxSwapAmount : tokenBal;

        // approve router
        _approve(address(this), address(router), amountToSwap);

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;

        uint256 pre = address(this).balance;

        try router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amountToSwap, 0, path, address(this), block.timestamp + 300
        ) {
            uint256 got = address(this).balance - pre;
            if (got > 0) {
                uint256 toOps = (got * OPS_SHARE_BPS) / BPS_DENOM;
                uint256 toCollector = got - toOps;
                
                _distributeETH(got);
                emit SwapBackExecuted(amountToSwap, got, toOps, toCollector);
            }
        } catch {
            // Swap failed, tokens remain in contract for next attempt
        }
    }

    // ====== Admin Functions ======
    function enableTrading() external onlyOwner {
        tradingEnabled = true;
        emit TradingEnabled();
    }

    function setFeeBps(uint16 newTotal) external onlyOwner {
        if (newTotal > MAX_FEE_BPS) revert FeeTooHigh();
        totalFeeBps = newTotal;
        emit FeesUpdated(newTotal);
    }

    function setWallets(
        address payable newOpsWallet, 
        address newFeeCollector,
        address newBuybackManager
    ) external onlyOwner {
        if (newOpsWallet == address(0) || newFeeCollector == address(0)) revert ZeroAddress();
        
        opsWallet = newOpsWallet;
        feeCollector = newFeeCollector;
        
        // Update buyback manager
        if (buybackManager != address(0)) {
            feeExempt[buybackManager] = false;
            limitExempt[buybackManager] = false;
        }
        
        buybackManager = newBuybackManager;
        
        // Set exemptions
        feeExempt[newOpsWallet] = true;
        feeExempt[newFeeCollector] = true;
        limitExempt[newOpsWallet] = true;
        limitExempt[newFeeCollector] = true;
        
        if (newBuybackManager != address(0)) {
            feeExempt[newBuybackManager] = true;
            limitExempt[newBuybackManager] = true;
        }
        
        emit WalletsUpdated(newOpsWallet, newFeeCollector, newBuybackManager);
    }

    function setMarket(address account, bool v) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        isMarket[account] = v;
        emit MarketSet(account, v);
    }

    function setFeeExempt(address account, bool v) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        feeExempt[account] = v;
        emit FeeExemptSet(account, v);
    }

    function setSwapSettings(uint256 threshold, uint256 maxAmt, bool enabled) external onlyOwner {
        swapThreshold = threshold;
        maxSwapAmount = maxAmt;
        swapEnabled = enabled;
        emit SwapSettingsSet(threshold, maxAmt, enabled);
    }

    function setLimits(uint256 newMaxTx, uint256 newMaxWallet, bool enabled) external onlyOwner {
        if (newMaxTx == 0 || newMaxWallet == 0) revert InvalidInput();
        if (newMaxWallet < newMaxTx) revert InvalidInput();
        
        maxTx = newMaxTx;
        maxWallet = newMaxWallet;
        limitsEnabled = enabled;
        
        emit LimitsUpdated(newMaxTx, newMaxWallet, enabled);
    }

    function setLimitExempt(address account, bool v) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        limitExempt[account] = v;
        emit LimitExemptSet(account, v);
    }

    function manualSwap(uint256 amount) external onlyOwner lockTheSwap nonReentrant {
        uint256 bal = balanceOf(address(this));
        if (amount == 0 || amount > bal) amount = bal;
        if (bal == 0) return;

        _approve(address(this), address(router), amount);

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = WETH;

        uint256 pre = address(this).balance;

        try router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amount, 0, path, address(this), block.timestamp + 300
        ) {
            uint256 got = address(this).balance - pre;
            if (got > 0) {
                _distributeETH(got);
            }
        } catch {
            revert SwapFailed();
        }
    }

    function setRouter(address newRouter) external onlyOwner {
        if (newRouter == address(0)) revert ZeroAddress();
        router = IUniswapV2Router02(newRouter);
        WETH = router.WETH();
    }

    // ====== Emergency Functions ======
    function rescueETH(uint256 amount) external onlyOwner {
        (bool ok,) = owner().call{value: amount}("");
        if (!ok) revert SwapFailed();
    }

    function rescueToken(address token, uint256 amount) external onlyOwner {
        if (token == address(this)) revert InvalidInput();
        ERC20(token).transfer(owner(), amount);
    }

    // ====== View Functions ======
    function getCirculatingSupply() external view returns (uint256) {
        return totalSupply() - balanceOf(address(0)) - balanceOf(address(0x000000000000000000000000000000000000dEaD));
    }

    function isExcludedFromFee(address account) external view returns (bool) {
        return feeExempt[account];
    }

    function isExcludedFromLimit(address account) external view returns (bool) {
        return limitExempt[account];
    }

    function getTokensInContract() external view returns (uint256) {
        return balanceOf(address(this));
    }

    // ====== Receive ETH ======
    receive() external payable {}
}