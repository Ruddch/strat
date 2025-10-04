// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury Contract for Weighted Dividend Distribution (off-chain snapshots)
 * @dev
 */
contract Treasury is Ownable, Pausable, ReentrancyGuard {
    IERC20 public immutable PENGU;
    uint256 public constant EPOCH_DURATION = 7 days;

    struct EpochInfo {
        uint256 epochId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalDividends;
        uint256 claimedAmount;
        bytes32 merkleRoot;
        bool isFinalized;
        bool isClaimable;
        bool rolloverProcessed;
        bool receivedRollover;
    }

    struct UserClaimInfo {
        uint256 weightedBalance; // OFFCHAIN
        uint256 claimAmount; // OFFCHAIN
        bool hasClaimed;
    }

    mapping(uint256 => EpochInfo) public epochs;
    mapping(uint256 => mapping(address => UserClaimInfo)) public userClaims;
    mapping(address => bool) public authorizedCallers;
    uint256 public currentEpoch = 0;

    event EpochStarted(uint256 indexed epochId, uint256 startTime);
    event EpochEnded(
        uint256 indexed epochId,
        uint256 endTime,
        uint256 totalDividends
    );
    event EpochFinalized(
        uint256 indexed epochId,
        bytes32 merkleRoot,
        uint256 totalClaimable
    );
    event DividendsAdded(uint256 indexed epochId, uint256 amount);
    event DividendsClaimed(
        uint256 indexed epochId,
        address indexed user,
        uint256 amount
    );
    event TokensRolledOver(
        uint256 indexed fromEpoch,
        uint256 indexed toEpoch,
        uint256 amount
    );

    modifier onlyAuthorized() {
        require(
            authorizedCallers[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }
    modifier validEpoch(uint256 epochId) {
        require(epochId > 0 && epochId <= currentEpoch, "Invalid epoch");
        _;
    }

    constructor(
        address _penguToken,
        address _initialOwner
    ) Ownable(_initialOwner) {
        PENGU = IERC20(_penguToken);
    }

    // ============ EPOCH MANAGEMENT ============

    function startNewEpoch() external onlyOwner whenNotPaused {
        if (currentEpoch > 0) {
            _endCurrentEpoch();
        }
        uint256 rollover = 0;
        if (currentEpoch > 2) {
            rollover = _processRollover(currentEpoch - 2);
        }
        currentEpoch++;
        EpochInfo storage newEpoch = epochs[currentEpoch];
        newEpoch.epochId = currentEpoch;
        newEpoch.startTime = block.timestamp;
        newEpoch.totalDividends = rollover;
        emit EpochStarted(currentEpoch, block.timestamp);
    }

    function _endCurrentEpoch() internal {
        require(currentEpoch > 0, "No active epoch");
        EpochInfo storage epoch = epochs[currentEpoch];
        epoch.endTime = block.timestamp;
        if (currentEpoch > 1) {
            EpochInfo storage prev = epochs[currentEpoch - 1];
            if (prev.isFinalized) prev.isClaimable = true;
        }

        if (currentEpoch > 3) epochs[currentEpoch - 3].isClaimable = false;
        emit EpochEnded(currentEpoch, block.timestamp, epoch.totalDividends);
    }

    function finalizeEpoch(
        uint256 epochId,
        bytes32 merkleRoot,
        uint256 totalClaimable
    ) external onlyOwner validEpoch(epochId) {
        EpochInfo storage epoch = epochs[epochId];
        require(epoch.endTime > 0, "Epoch not ended");
        require(!epoch.isFinalized, "Already finalized");
        require(
            totalClaimable <= epoch.totalDividends,
            "Invalid claimable amount"
        );
        epoch.merkleRoot = merkleRoot;
        epoch.isFinalized = true;
        if (epochId == currentEpoch - 1) epoch.isClaimable = true;
        emit EpochFinalized(epochId, merkleRoot, totalClaimable);
    }

    // ============ DIVIDEND MANAGEMENT ============

    function addDividends(
        uint256 amount
    ) external onlyAuthorized whenNotPaused {
        require(currentEpoch > 0, "No active epoch");
        require(epochs[currentEpoch].endTime == 0, "Epoch already ended");
        require(amount > 0, "Amount must be positive");
        require(
            PENGU.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        epochs[currentEpoch].totalDividends += amount;
        emit DividendsAdded(currentEpoch, amount);
    }

    function emergencyAddDividends(
        uint256 epochId,
        uint256 amount
    ) external onlyOwner validEpoch(epochId) {
        epochs[epochId].totalDividends += amount;
        emit DividendsAdded(epochId, amount);
    }

    function depositPengu(
        uint256 amount
    ) external onlyAuthorized whenNotPaused {
        require(currentEpoch > 0, "No active epoch");
        require(epochs[currentEpoch].endTime == 0, "Epoch already ended");
        require(amount > 0, "Amount must be positive");

        epochs[currentEpoch].totalDividends += amount;
        emit DividendsAdded(currentEpoch, amount);
    }

    // ============ CLAIM SYSTEM ============

    function claimDividends(
        uint256 epochId,
        uint256 weightedBalance,
        uint256 claimAmount,
        bytes32[] calldata merkleProof
    ) external nonReentrant whenNotPaused validEpoch(epochId) {
        EpochInfo storage epoch = epochs[epochId];
        require(epoch.isClaimable, "Epoch not claimable");
        require(
            epochId == currentEpoch - 1,
            "Only previous epoch can be claimed"
        );
        require(!userClaims[epochId][msg.sender].hasClaimed, "Already claimed");
        require(claimAmount > 0, "Nothing to claim");

        require(
            PENGU.balanceOf(address(this)) >= claimAmount,
            "Insufficient contract balance"
        );

        bytes32 leaf = keccak256(
            abi.encodePacked(msg.sender, weightedBalance, claimAmount)
        );
        require(
            MerkleProof.verify(merkleProof, epoch.merkleRoot, leaf),
            "Invalid Merkle proof"
        );
        userClaims[epochId][msg.sender] = UserClaimInfo(
            weightedBalance,
            claimAmount,
            true
        );
        epoch.claimedAmount += claimAmount;
        require(
            PENGU.transfer(msg.sender, claimAmount),
            "Token transfer failed"
        );
        emit DividendsClaimed(epochId, msg.sender, claimAmount);
    }

    // ============ ROLLOVER SYSTEM ============

    function _processRollover(
        uint256 expiredEpochId
    ) internal returns (uint256 rolledOverAmount) {
        EpochInfo storage expiredEpoch = epochs[expiredEpochId];

        if (expiredEpoch.rolloverProcessed) return 0;

        rolledOverAmount =
            expiredEpoch.totalDividends -
            expiredEpoch.claimedAmount;

        expiredEpoch.rolloverProcessed = true;

        epochs[currentEpoch + 1].receivedRollover = true;

        if (rolledOverAmount > 0) {
            emit TokensRolledOver(
                expiredEpochId,
                currentEpoch + 1,
                rolledOverAmount
            );
        }
        return rolledOverAmount;
    }

    // ============ VIEW FUNCTIONS ============

    function getEpochInfo(
        uint256 epochId
    )
        external
        view
        validEpoch(epochId)
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 totalDividends,
            uint256 claimedAmount,
            bool isFinalized,
            bool isClaimable,
            bool rolloverProcessed,
            bool receivedRollover
        )
    {
        EpochInfo storage epoch = epochs[epochId];
        return (
            epoch.startTime,
            epoch.endTime,
            epoch.totalDividends,
            epoch.claimedAmount,
            epoch.isFinalized,
            epoch.isClaimable,
            epoch.rolloverProcessed,
            epoch.receivedRollover
        );
    }

    function hasUserClaimed(
        address user,
        uint256 epochId
    ) external view validEpoch(epochId) returns (bool) {
        return userClaims[epochId][user].hasClaimed;
    }

    function getUserClaimInfo(
        address user,
        uint256 epochId
    ) external view validEpoch(epochId) returns (UserClaimInfo memory) {
        return userClaims[epochId][user];
    }

    function getCurrentClaimableEpoch() external view returns (uint256) {
        if (currentEpoch > 1) {
            uint256 prev = currentEpoch - 1;
            if (epochs[prev].isClaimable) return prev;
        }
        return 0;
    }

    function isEpochClaimable(
        uint256 epochId
    ) external view validEpoch(epochId) returns (bool) {
        return epochs[epochId].isClaimable && epochId == currentEpoch - 1;
    }

    function getCurrentEpochStatus()
        external
        view
        returns (
            uint256 activeEpochId,
            uint256 claimableEpochId,
            uint256 activeEpochStartTime,
            uint256 activeEpochDividends,
            uint256 claimableDividends,
            uint256 claimedAmount
        )
    {
        activeEpochId = currentEpoch;
        claimableEpochId = (currentEpoch > 1 &&
            epochs[currentEpoch - 1].isClaimable)
            ? currentEpoch - 1
            : 0;
        if (activeEpochId > 0) {
            activeEpochStartTime = epochs[activeEpochId].startTime;
            activeEpochDividends = epochs[activeEpochId].totalDividends;
        }
        if (claimableEpochId > 0) {
            claimableDividends = epochs[claimableEpochId].totalDividends;
            claimedAmount = epochs[claimableEpochId].claimedAmount;
        }
    }
    function getContractBalance() external view returns (uint256) {
        return PENGU.balanceOf(address(this));
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Set authorized caller (FeeCollector, etc.)
     */
    function setAuthorizedCaller(
        address caller,
        bool authorized
    ) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw (only unclaimed expired tokens)
     */
    function emergencyWithdraw(
        uint256 epochId,
        uint256 amount
    ) external onlyOwner validEpoch(epochId) {
        require(!epochs[epochId].isClaimable, "Epoch still claimable");
        require(
            epochId < currentEpoch - 1,
            "Cannot withdraw from recent epochs"
        );
        require(
            amount <=
                epochs[epochId].totalDividends - epochs[epochId].claimedAmount,
            "Insufficient unclaimed amount"
        );

        require(PENGU.transfer(owner(), amount), "Token transfer failed");
    }

    function forceRollover(
        uint256 expiredEpochId,
        uint256 targetEpochId
    ) external onlyOwner validEpoch(expiredEpochId) validEpoch(targetEpochId) {
        require(targetEpochId > expiredEpochId, "Invalid target epoch");
        require(!epochs[expiredEpochId].isClaimable, "Epoch still claimable");

        require(
            !epochs[expiredEpochId].rolloverProcessed,
            "Rollover already processed"
        );
        uint256 rolledOverAmount = epochs[expiredEpochId].totalDividends -
            epochs[expiredEpochId].claimedAmount;
        epochs[targetEpochId].totalDividends += rolledOverAmount;

        epochs[expiredEpochId].rolloverProcessed = true;
        emit TokensRolledOver(expiredEpochId, targetEpochId, rolledOverAmount);
    }

    /**
     * @dev Get total unclaimed amount from expired epochs
     */
    function getTotalUnclaimedExpired() external view returns (uint256 total) {
        for (uint256 i = 1; i <= currentEpoch; i++) {
            EpochInfo storage epoch = epochs[i];

            if (
                epoch.endTime == 0 ||
                epoch.isClaimable ||
                epoch.rolloverProcessed ||
                epoch.receivedRollover
            ) continue;

            total += epoch.totalDividends - epoch.claimedAmount;
        }
        return total;
    }

    /**
     * @dev Get total claimed amount across all epochs
     */
    function getTotalClaimedDividends() external view returns (uint256 total) {
        for (uint256 i = 1; i <= currentEpoch; i++) {
            EpochInfo storage epoch = epochs[i];

            if (epoch.endTime == 0) continue; // Skip active epoch

            total += epoch.claimedAmount;
        }
        return total;
    }

    function getUserTotalClaimedDividends(
        address user
    ) external view returns (uint256 total) {
        for (uint256 i = 1; i <= currentEpoch; i++) {
            EpochInfo storage epoch = epochs[i];

            if (epoch.endTime == 0) continue; // Skip active epoch

            UserClaimInfo storage userClaim = userClaims[i][user];
            total += userClaim.claimedAmount;
        }
        return total;
    }

    function getUserCurrentEpochDividends(
        address user
    ) external view returns (uint256) {
        if (currentEpoch == 0) return 0;

        UserClaimInfo storage userClaim = userClaims[currentEpoch][user];
        return userClaim.claimedAmount;
    }

    function getUserClaimableInfo(
        address user
    )
        external
        view
        returns (bool canClaim, uint256 claimableAmount, uint256 epochId)
    {
        if (currentEpoch <= 1) {
            return (false, 0, 0);
        }

        uint256 claimableEpoch = currentEpoch - 1;
        EpochInfo storage epoch = epochs[claimableEpoch];

        if (!epoch.isClaimable) {
            return (false, 0, claimableEpoch);
        }

        UserClaimInfo storage userClaim = userClaims[claimableEpoch][user];

        if (userClaim.hasClaimed) {
            return (false, 0, claimableEpoch);
        }

        return (true, userClaim.claimAmount, claimableEpoch);
    }
}
