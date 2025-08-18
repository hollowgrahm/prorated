// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ProratedPoolStorage} from "./ProratedPoolStorage.sol";
import {IProratedToken} from "./interfaces/IProratedToken.sol";
import {IProswapFactory} from "./interfaces/IProswapFactory.sol";
import {IProswapRouter} from "./interfaces/IProswapRouter.sol";
import {IProratedVeNFT} from "./interfaces/IProratedVeNFT.sol";
import {IProratedGovernor} from "./interfaces/IProratedGovernor.sol";
import {IProratedTreasury} from "./interfaces/IProratedTreasury.sol";
import {ITokenDeployer} from "./interfaces/ITokenDeployer.sol";
import {IPairDeployer} from "./interfaces/IPairDeployer.sol";
import {ILiquidityDeployer} from "./interfaces/ILiquidityDeployer.sol";
import {IVeNFTDeployer} from "./interfaces/IVeNFTDeployer.sol";
import {IGovernorDeployer} from "./interfaces/IGovernorDeployer.sol";
import {ITreasuryDeployer} from "./interfaces/ITreasuryDeployer.sol";
import {IProlendDeployer} from "./interfaces/IProlendDeployer.sol";
import {ProratedToken} from "./ProratedToken.sol";
import {ProratedVeNFT} from "./ProratedVeNFT.sol";
import {ProratedGovernor} from "./ProratedGovernor.sol";
import {ProratedTreasury} from "./ProratedTreasury.sol";

contract ProratedPool is ProratedPoolStorage, Owned, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    // ============ ERRORS ============
    error PoolClosed();
    error InvalidLockDuration();
    error InvalidAmount();
    error ContributionExists();
    error NoContribution();
    error PoolNotEnded();
    error AlreadyClaimed();
    error MinimumNotReached();
    error PoolReachedMinimum();
    error TokenNotDeployed();
    error TokenAlreadyDeployed();
    error PairNotDeployed();
    error PairAlreadyDeployed();
    error LiquidityNotDeployed();
    error LiquidityAlreadyDeployed();
    error VeNFTNotDeployed();
    error VeNFTAlreadyDeployed();
    error GovernorNotDeployed();
    error GovernorAlreadyDeployed();
    error TreasuryNotDeployed();
    error TreasuryAlreadyDeployed();
    error ProlendAlreadyDeployed();
    error Unauthorized();
    error NoLPTokensReserved();
    error LockDurationNotIncreased();

    // ============ EVENTS ============
    event Contributed(
        address indexed contributor,
        uint256 amount,
        uint256 lockWeeks,
        uint256 shares
    );

    event ContributionIncreased(
        address indexed contributor,
        uint256 additionalAmount,
        uint256 lockWeeks,
        uint256 additionalShares
    );

    event LockDurationIncreased(
        address indexed contributor,
        uint256 oldLockDuration,
        uint256 newLockDuration,
        uint256 oldShares,
        uint256 newShares
    );

    event RefundClaimed(address indexed contributor, uint256 amount);
    event DeveloperFundsWithdrawn(address indexed developer, uint256 amount);
    event TokenDeployed(address indexed token);
    event VeNFTDeployed(address indexed venft);
    event PairDeployed(address indexed pair);
    event LiquidityDeployed(
        uint256 lpTokensReceived,
        uint256 developerAllocation,
        uint256 treasuryAllocation
    );
    event TreasuryDeployed(address indexed treasury);
    event GovernorDeployed(address indexed governor);
    event ProlendDeployed(
        address indexed prolendPair80,
        address indexed prolendPair20
    );

    event VeNFTPositionCreated(
        address indexed user,
        uint256 indexed tokenId,
        uint256 lpTokens,
        uint256 lockDuration
    );

    event DeveloperTokensReleased(
        address indexed developer,
        uint256 lpTokens,
        uint256 tokenId
    );

    event TreasuryTokensReleased(
        address indexed treasury,
        uint256 lpTokens,
        uint256 tokenId
    );

    // ============ STRUCTS ============
    struct PoolConfig {
        address owner;
        string tokenName;
        string tokenSymbol;
        uint256 tokenTotalSupply;
        uint256 developmentFund;
        uint256 liquidityFund;
        uint256 startTime;
        uint256 endTime;
        address fundingToken;
        uint256 developerPercent;
        uint256 treasuryPercent;
        uint256 daoPercent;
    }

    // ============ MODIFIERS ============
    modifier poolActive() {
        if (block.timestamp < startTime || block.timestamp > endTime)
            revert PoolClosed();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    modifier validLockDuration(uint256 lockDuration) {
        if (lockDuration < MIN_LOCK || lockDuration > MAX_LOCK)
            revert InvalidLockDuration();
        _;
    }

    modifier tokenDeployed() {
        if (address(proratedToken) == address(0)) revert TokenNotDeployed();
        _;
    }

    modifier poolEnded() {
        if (block.timestamp < endTime) revert PoolNotEnded();
        _;
    }

    // ============ CONSTRUCTOR & SETUP ============
    constructor(
        PoolConfig memory config,
        address _proswapFactory,
        address _proswapRouter,
        address _tokenDeployer,
        address _pairDeployer,
        address _liquidityDeployer,
        address _veNFTDeployer,
        address _governorDeployer,
        address _treasuryDeployer,
        address _prolendDeployer
    ) Owned(config.owner) {
        // No validation needed - factory validates before deployment

        // Step 1: Set developer address (same as owner for clarity)
        developer = config.owner;

        // Step 2: Initialize token configuration
        tokenName = config.tokenName;
        tokenSymbol = config.tokenSymbol;
        tokenTotalSupply = config.tokenTotalSupply;

        // Step 3: Set funding targets and minimums
        developmentFund = config.developmentFund;
        liquidityFund = config.liquidityFund;
        minTotalContributions = developmentFund + liquidityFund;

        // Step 4: Set pool timing parameters
        startTime = config.startTime;
        endTime = config.endTime;

        // Step 5: Initialize external contract interfaces
        fundingToken = ERC20(config.fundingToken);
        proswapFactory = IProswapFactory(_proswapFactory);
        proswapRouter = IProswapRouter(_proswapRouter);
        tokenDeployer = ITokenDeployer(_tokenDeployer);
        pairDeployer = IPairDeployer(_pairDeployer);
        liquidityDeployer = ILiquidityDeployer(_liquidityDeployer);
        veNFTDeployer = IVeNFTDeployer(_veNFTDeployer);
        governorDeployer = IGovernorDeployer(_governorDeployer);
        treasuryDeployer = ITreasuryDeployer(_treasuryDeployer);
        prolendDeployer = IProlendDeployer(_prolendDeployer);

        // Step 6: Set allocation percentages for developer, treasury, and dao
        developerPercent = config.developerPercent;
        treasuryPercent = config.treasuryPercent;
        daoPercent = config.daoPercent;
    }

    // ============ USER FUNCTIONS ============
    /// @notice Contributes tokens to the pool with a specified lock duration
    /// @param amount Amount of funding tokens to contribute
    /// @param lockDuration Lock duration in weeks (1-208 weeks)
    /// @dev Creates a new contribution and calculates shares based on amount * lockDuration
    function contribute(
        uint256 amount,
        uint256 lockDuration
    )
        external
        poolActive
        validAmount(amount)
        validLockDuration(lockDuration)
        nonReentrant
    {
        if (hasContribution(msg.sender)) revert ContributionExists();

        // Step 1: Transfer funding tokens from user to pool contract
        fundingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Step 2: Calculate user's shares based on amount * lock duration
        uint256 shares = amount * lockDuration;

        // Step 3: Create contribution record with user's data
        contributions[msg.sender] = Contribution({
            amount: amount,
            lockDuration: lockDuration,
            shares: shares,
            claimed: false
        });

        // Step 5: Update global totals
        totalContributions += amount;
        totalShares += shares;

        // Step 6: Emit event for off-chain tracking
        emit Contributed(msg.sender, amount, lockDuration, shares);
    }

    /// @notice Increases the contribution amount for an existing position
    /// @param amount Additional amount of funding tokens to contribute
    /// @dev Uses the existing lock duration to calculate additional shares
    function increaseContribution(
        uint256 amount
    ) external poolActive validAmount(amount) nonReentrant {
        if (!hasContribution(msg.sender)) revert NoContribution();

        // Step 1: Transfer additional funding tokens from user to pool contract
        fundingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Step 2: Get user's existing lock duration for share calculation
        uint256 lockDuration = contributions[msg.sender].lockDuration;

        // Step 3: Calculate additional shares based on new amount * existing lock duration
        uint256 newShares = amount * lockDuration;

        // Step 4: Update user's contribution record with additional amount and shares
        contributions[msg.sender].amount += amount;
        contributions[msg.sender].shares += newShares;

        // Step 5: Update global totals
        totalContributions += amount;
        totalShares += newShares;

        // Step 6: Emit event for off-chain tracking
        emit ContributionIncreased(msg.sender, amount, lockDuration, newShares);
    }

    /// @notice Increases the lock duration for an existing contribution
    /// @param newLockDuration New lock duration in weeks (1-208 weeks)
    /// @dev Recalculates shares based on the new lock duration
    function increaseLockDuration(
        uint256 newLockDuration
    ) external poolActive validLockDuration(newLockDuration) nonReentrant {
        if (!hasContribution(msg.sender)) revert NoContribution();

        // Step 1: Get user's existing contribution data
        uint256 oldShares = contributions[msg.sender].shares;
        uint256 userAmount = contributions[msg.sender].amount;
        uint256 oldLockDuration = contributions[msg.sender].lockDuration;

        // Step 2: Enforce increase-only semantics for lock duration
        if (newLockDuration <= oldLockDuration)
            revert LockDurationNotIncreased();

        // Step 3: Calculate new shares based on existing amount * new lock duration
        uint256 newShares = newLockDuration * userAmount;

        // Step 4: Update global total shares (remove old shares, add new shares)
        totalShares = totalShares - oldShares + newShares;

        // Step 5: Update user's contribution record with new lock duration and shares
        contributions[msg.sender].lockDuration = newLockDuration;
        contributions[msg.sender].shares = newShares;

        // Step 6: Emit event for off-chain tracking
        emit LockDurationIncreased(
            msg.sender,
            oldLockDuration,
            newLockDuration,
            oldShares,
            newShares
        );
    }

    // ============ VIEW FUNCTIONS ============
    /// @notice Checks if the user has a contribution
    /// @param user The address of the user to check
    /// @return True if the user has a contribution, false otherwise
    function hasContribution(address user) public view returns (bool) {
        return contributions[user].amount > 0;
    }

    /// @notice Checks if the pool has reached the minimum funding requirement
    /// @return True if the pool has reached minimum contributions, false otherwise
    function hasReachedMinimum() public view returns (bool) {
        return totalContributions >= minTotalContributions;
    }

    /// @notice Allows users to claim refund if pool fails to reach minimum
    /// @dev Can only be called after pool ends and if minimum not reached
    function claimRefund() external poolEnded nonReentrant {
        // Step 1: Check if user has a contribution
        if (!hasContribution(msg.sender)) revert NoContribution();

        // Step 3: Check if minimum has been reached (prevent refund if successful)
        if (hasReachedMinimum()) revert PoolReachedMinimum();

        // Step 4: Check if user has already claimed their refund
        if (contributions[msg.sender].claimed) revert AlreadyClaimed();

        // Step 5: Mark contribution as claimed to prevent double-claiming
        contributions[msg.sender].claimed = true;

        // Step 6: Transfer refund amount to user
        fundingToken.safeTransfer(msg.sender, contributions[msg.sender].amount);

        // Step 7: Emit event for off-chain tracking
        emit RefundClaimed(msg.sender, contributions[msg.sender].amount);
    }

    // ============ DEPLOYMENT SEQUENCE ============
    /// @notice Thin forwarder to deploy token via shared deployer
    function deployToken() external poolEnded {
        if (!hasReachedMinimum()) revert MinimumNotReached();
        if (address(proratedToken) != address(0)) revert TokenAlreadyDeployed();
        tokenDeployer.deployToken(address(this));
    }

    /// @notice Deploys the pair (second deployment function)
    /// @dev Can only be called after token is deployed
    function deployPair() external tokenDeployed {
        if (proswapPair != address(0)) revert PairAlreadyDeployed();
        pairDeployer.deployPair(address(this));
    }

    /// @notice Seeds liquidity and calculates allocations (third deployment function)
    /// @dev Can only be called after pair is deployed
    function deployLiquidity() external {
        if (proswapPair == address(0)) revert PairNotDeployed();
        if (totalLPTokensReceived > 0) revert LiquidityAlreadyDeployed();
        liquidityDeployer.deployLiquidity(address(this));
    }

    /// @notice Deploy veNFT contract (anyone can call, first deployment wins)
    function deployVeNFT() external {
        if (address(proratedVeNFT) != address(0)) revert VeNFTAlreadyDeployed();
        if (totalLPTokensReceived == 0) revert LiquidityNotDeployed();
        string memory lpName = ERC20(proswapPair).name();
        string memory lpSymbol = ERC20(proswapPair).symbol();
        string memory veName = string(
            abi.encodePacked("Prorated veNFT - ", lpName)
        );
        string memory veSymbol = string(abi.encodePacked("ve", lpSymbol));
        veNFTDeployer.deployVeNFT(address(this), veName, veSymbol);
    }

    /// @notice Deploy Governor contract (anyone can call, first deployment wins)
    function deployGovernor() external {
        if (address(proratedGovernor) != address(0))
            revert GovernorAlreadyDeployed();
        if (address(proratedVeNFT) == address(0)) revert VeNFTNotDeployed();
        governorDeployer.deployGovernor(address(this));
    }

    /// @notice Deploy Treasury contract (anyone can call, first deployment wins)
    function deployTreasury() external {
        if (address(proratedTreasury) != address(0))
            revert TreasuryAlreadyDeployed();
        if (address(proratedGovernor) == address(0))
            revert GovernorNotDeployed();
        treasuryDeployer.deployTreasury(address(this));
    }

    /// @notice Deploy Prolend lending pairs (anyone can call, first deployment wins)
    function deployProlend() external {
        if (prolendPair80 != address(0)) revert ProlendAlreadyDeployed();
        if (proswapPair == address(0)) revert PairNotDeployed();
        prolendDeployer.deployProlend(address(this));
    }

    // ============ ONLY-DEPLOYER HOOKS ============
    function setToken(address token) external {
        if (msg.sender != address(tokenDeployer)) revert Unauthorized();
        if (token != address(0) && address(proratedToken) == address(0)) {
            proratedToken = IProratedToken(token);
            emit TokenDeployed(token);
        }
    }

    function setPair(address pair) external {
        if (msg.sender != address(pairDeployer)) revert Unauthorized();
        if (pair != address(0) && proswapPair == address(0)) {
            proswapPair = pair;
            emit PairDeployed(pair);
        }
    }

    function setVeNFT(address venft) external {
        if (msg.sender != address(veNFTDeployer)) revert Unauthorized();
        if (venft != address(0) && address(proratedVeNFT) == address(0)) {
            proratedVeNFT = IProratedVeNFT(venft);
            emit VeNFTDeployed(venft);
        }
    }

    function setGovernor(address governor) external {
        if (msg.sender != address(governorDeployer)) revert Unauthorized();
        if (governor != address(0) && address(proratedGovernor) == address(0)) {
            proratedGovernor = IProratedGovernor(governor);
            emit GovernorDeployed(governor);
            // As pool is the owner of the governor, approve self as a target
            proratedGovernor.addApprovedTarget(address(this));
        }
    }

    function setTreasury(address treasury) external {
        if (msg.sender != address(treasuryDeployer)) revert Unauthorized();
        if (treasury != address(0) && address(proratedTreasury) == address(0)) {
            proratedTreasury = IProratedTreasury(treasury);
            emit TreasuryDeployed(treasury);
        }
    }

    function setProlendPairs(
        address _prolendPair80,
        address _prolendPair20
    ) external {
        if (msg.sender != address(prolendDeployer)) revert Unauthorized();
        if (_prolendPair80 != address(0) && prolendPair80 == address(0)) {
            prolendPair80 = _prolendPair80;
            prolendPair20 = _prolendPair20;
            emit ProlendDeployed(_prolendPair80, _prolendPair20);
        }
    }

    function setLPAllocations(
        uint256 totalLp,
        uint256 developerLp,
        uint256 treasuryLp,
        uint256 daoLp
    ) external {
        if (msg.sender != address(liquidityDeployer)) revert Unauthorized();
        totalLPTokensReceived = totalLp;
        developerLPTokens = developerLp;
        treasuryLPTokens = treasuryLp;
        daoLPTokens = daoLp;

        emit LiquidityDeployed(totalLp, developerLp, treasuryLp);
    }

    function moveLiquidityToPair(
        uint256 tokenAmount,
        uint256 fundingAmount
    ) external nonReentrant {
        if (msg.sender != address(liquidityDeployer)) revert Unauthorized();
        if (proswapPair == address(0)) revert PairNotDeployed();
        if (totalLPTokensReceived > 0) revert LiquidityAlreadyDeployed();

        // Transfer both tokens from the pool to the pair
        ERC20(address(proratedToken)).safeTransfer(proswapPair, tokenAmount);
        fundingToken.safeTransfer(proswapPair, fundingAmount);
    }

    // removed executeLiquidityProvision: LiquidityDeployer mints directly

    // ============ USER POSITION MANAGEMENT ============
    /// @notice Creates a veNFT position for a user based on their contribution
    /// @dev Can only be called after pool is finalized and if user has unclaimed contribution
    function createVeNFTPosition() external nonReentrant {
        // Step 1: Check that veNFT has been deployed (required for position creation)
        if (address(proratedVeNFT) == address(0)) revert VeNFTNotDeployed();
        // Step 1: Get user's contribution data from storage
        Contribution memory userContribution = contributions[msg.sender];

        // Step 2: Check if user has a contribution
        if (!hasContribution(msg.sender)) revert NoContribution();

        // Step 3: Check if user has already claimed their contribution
        if (userContribution.claimed) revert AlreadyClaimed();

        // Step 4: Calculate user's LP token share based on their contribution shares
        uint256 userLPTokens = (userContribution.shares * daoLPTokens) /
            totalShares;

        // Step 5: Validate that user has a non-zero LP token allocation
        if (userLPTokens == 0) revert InvalidAmount();

        // Step 6: Mark contribution as claimed to prevent double-claiming
        contributions[msg.sender].claimed = true;

        // Step 7: Approve veNFT contract to spend user's LP tokens
        ERC20(proswapPair).approve(address(proratedVeNFT), userLPTokens);

        // Step 8: Create veNFT position with user's lock duration (convert weeks to seconds)
        uint256 lockDuration = userContribution.lockDuration * WEEK;
        uint256 tokenId = proratedVeNFT.createLock(userLPTokens, lockDuration);

        // Step 9: Transfer the veNFT from pool to user
        proratedVeNFT.transferFrom(address(this), msg.sender, tokenId);

        // Step 10: Emit event for off-chain tracking
        emit VeNFTPositionCreated(
            msg.sender,
            tokenId,
            userLPTokens,
            lockDuration
        );
    }

    // ============ GOVERNANCE & WITHDRAWAL FUNCTIONS ============
    /// @notice Allows dev team to withdraw remaining funding tokens after pool is finalized
    /// @dev Can only be called by dev team after pool has reached minimum and ended, after liquidity is deployed
    function developerFundsWithdraw() external onlyOwner {
        // Step 1: Check that veNFT has been deployed (required for withdrawal)
        if (address(proratedVeNFT) == address(0)) revert VeNFTNotDeployed();

        // Step 2: Transfer developmentFund to developer
        fundingToken.safeTransfer(msg.sender, developmentFund);

        // Step 3: Emit event for off-chain tracking
        emit DeveloperFundsWithdrawn(msg.sender, developmentFund);
    }

    /// @notice Release dev team's LP tokens (governance function)
    /// @dev Can only be called by approved governor after successful proposal
    function createDeveloperVeNFT() external nonReentrant {
        // Step 1: Check that governor has been deployed
        if (address(proratedGovernor) == address(0))
            revert GovernorNotDeployed();
        // Step 2: Check that caller is the approved governor
        if (msg.sender != address(proratedGovernor)) revert Unauthorized();
        // Step 3: Check that developer has LP tokens allocated
        if (developerLPTokens == 0) revert NoLPTokensReserved();

        // Step 4: Cache and clear allocation before external calls (CEI)
        uint256 allocation = developerLPTokens;
        developerLPTokens = 0;

        // Step 5: Create max-locked veNFT position for developer (MAX_LOCK weeks)
        ERC20(proswapPair).approve(address(proratedVeNFT), allocation);
        uint256 developerTokenId = proratedVeNFT.createLock(
            allocation,
            MAX_LOCK * WEEK
        );

        // Step 6: Transfer the veNFT to developer
        proratedVeNFT.transferFrom(address(this), developer, developerTokenId);

        // Step 7: Emit event for off-chain tracking
        emit DeveloperTokensReleased(developer, allocation, developerTokenId);
    }

    /// @notice Release treasury's LP tokens (governance function)
    /// @dev Can be called by anyone after successful governance proposal
    function createTreasuryVeNFT() external nonReentrant {
        // Step 1: Check that treasury has been deployed (required for treasury operations)
        if (address(proratedTreasury) == address(0))
            revert TreasuryNotDeployed();

        // Step 2: Check that treasury has LP tokens allocated
        if (treasuryLPTokens == 0) revert NoLPTokensReserved();

        // Step 3: Cache and clear allocation before external calls (CEI)
        uint256 allocationTreasury = treasuryLPTokens;
        treasuryLPTokens = 0;

        // Step 4: Approve and create veNFT position for treasury (MAX_LOCK weeks)
        ERC20(proswapPair).approve(address(proratedVeNFT), allocationTreasury);
        uint256 treasuryTokenId = proratedVeNFT.createLock(
            allocationTreasury,
            MAX_LOCK * WEEK
        );

        // Step 5: Transfer the veNFT to treasury
        proratedVeNFT.transferFrom(
            address(this),
            address(proratedTreasury),
            treasuryTokenId
        );

        // Step 6: Emit event for off-chain tracking
        emit TreasuryTokensReleased(
            address(proratedTreasury),
            allocationTreasury,
            treasuryTokenId
        );
    }
}
