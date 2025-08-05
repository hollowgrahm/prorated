// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ProratedPoolStorage} from "./ProratedPoolStorage.sol";
import {ProratedToken} from "./ProratedToken.sol";
import {IProratedToken} from "./interfaces/IProratedToken.sol";
import {IProswapFactory} from "./interfaces/IProswapFactory.sol";
import {IProswapRouter} from "./interfaces/IProswapRouter.sol";
import {IProratedVENFT} from "./interfaces/IProratedVENFT.sol";
import {IProratedGovernor} from "./interfaces/IProratedGovernor.sol";
import {IProratedTreasury} from "./interfaces/IProratedTreasury.sol";
import {ProratedVENFT} from "./ProratedVENFT.sol";
import {ProratedGovernor} from "./ProratedGovernor.sol";
import {ProratedTreasury} from "./ProratedTreasury.sol";

contract ProratedPool is ProratedPoolStorage, Owned, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    struct PoolConfig {
        address owner;
        string tokenName;
        string tokenSymbol;
        uint256 tokenTotalSupply;
        uint256 desiredContributions;
        uint256 startTime;
        uint256 endTime;
        address fundingToken;
        address proswapFactory;
        address proswapRouter;
        uint256 devTeamAllocationPercentage;
        uint256 treasuryAllocationPercentage;
    }

    error PoolClosed();
    error InvalidLockDuration();
    error InvalidAmount();
    error ContributionExists();
    error NoContribution();
    error PoolNotEnded();
    error AlreadyClaimed();
    error PoolReachedMinimum();
    error TokenNotDeployed();
    error TokenAlreadyDeployed();
    error PairNotDeployed();
    error PairAlreadyDeployed();
    error LiquidityNotDeployed();
    error LiquidityAlreadyDeployed();
    error VENFTNotDeployed();
    error VENFTAlreadyDeployed();
    error GovernorNotDeployed();
    error GovernorAlreadyDeployed();
    error TreasuryAlreadyDeployed();
    error ContributionAlreadyClaimed();
    error Unauthorized();
    error NoTokensReserved();
    error InvalidVENFT();

    event Contributed(
        address indexed contributor,
        uint256 amount,
        uint256 lockWeeks,
        uint256 shares
    );

    event RefundClaimed(address indexed contributor, uint256 amount);

    event VENFTPositionCreated(
        address indexed user,
        uint256 indexed tokenId,
        uint256 lpTokens,
        uint256 lockDuration
    );

    event DevTeamTokensReleased(
        address indexed devTeam,
        uint256 lpTokens,
        uint256 tokenId
    );

    event TreasuryTokensReleased(address indexed treasury, uint256 lpTokens);
    event VENFTDeployed(address indexed venft);
    event TreasuryDeployed(address indexed treasury);
    event GovernorDeployed(address indexed governor);

    modifier poolActive() {
        if (block.timestamp < startTime || block.timestamp > endTime)
            revert PoolClosed();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    modifier hasContribution() {
        if (contributions[msg.sender].amount == 0) revert NoContribution();
        _;
    }

    modifier noContribution() {
        if (contributions[msg.sender].amount != 0) revert ContributionExists();
        _;
    }

    modifier validLockDuration(uint256 lockDuration) {
        if (lockDuration < MIN_LOCK || lockDuration > MAX_LOCK)
            revert InvalidLockDuration();
        _;
    }

    // 1. CONSTRUCTOR & SETUP
    constructor(PoolConfig memory config) Owned(config.owner) {
        // Step 1: Set dev team address (same as owner for clarity)
        devTeam = config.owner;

        // Step 2: Initialize token configuration
        tokenName = config.tokenName;
        tokenSymbol = config.tokenSymbol;
        tokenTotalSupply = config.tokenTotalSupply;

        // Step 3: Set contribution targets and minimums
        desiredContributions = config.desiredContributions;
        minTotalContributions = config.desiredContributions * 2; // Minimum is 2x desired

        // Step 4: Set pool timing parameters
        startTime = config.startTime;
        endTime = config.endTime;

        // Step 5: Initialize external contract interfaces
        fundingToken = ERC20(config.fundingToken);
        proswapFactory = IProswapFactory(config.proswapFactory);
        proswapRouter = IProswapRouter(config.proswapRouter);

        // Step 6: Set allocation percentages for dev team and treasury
        devTeamAllocationPercentage = config.devTeamAllocationPercentage;
        treasuryAllocationPercentage = config.treasuryAllocationPercentage;
    }

    // 2. CONTRIBUTION FUNCTIONS
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
        noContribution
        validLockDuration(lockDuration)
        nonReentrant
    {
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
    ) external poolActive validAmount(amount) hasContribution nonReentrant {
        fundingToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 lockDuration = contributions[msg.sender].lockDuration;
        uint256 newShares = amount * lockDuration;

        contributions[msg.sender].amount += amount;
        contributions[msg.sender].shares += newShares;
        totalContributions += amount;
        totalShares += newShares;

        emit Contributed(msg.sender, amount, lockDuration, newShares);
    }

    /// @notice Increases the lock duration for an existing contribution
    /// @param newLockDuration New lock duration in weeks (1-208 weeks)
    /// @dev Recalculates shares based on the new lock duration
    function increaseLockDuration(
        uint256 newLockDuration
    )
        external
        poolActive
        hasContribution
        validLockDuration(newLockDuration)
        nonReentrant
    {
        uint256 oldShares = contributions[msg.sender].shares;
        uint256 newShares = newLockDuration * contributions[msg.sender].amount;
        totalShares = totalShares - oldShares + newShares;

        contributions[msg.sender].lockDuration = newLockDuration;
        contributions[msg.sender].shares = newShares;

        emit Contributed(msg.sender, 0, newLockDuration, newShares);
    }

    // 3. POOL STATE FUNCTIONS
    /// @notice Checks if the pool has reached the minimum funding requirement
    /// @return True if the pool has reached minimum contributions, false otherwise
    /// @dev Can only be called after the pool has ended
    function hasReachedMinimum() public view returns (bool) {
        if (block.timestamp < endTime) revert PoolNotEnded();
        return totalContributions >= minTotalContributions;
    }

    /// @notice Allows contributors to claim refunds if pool doesn't reach minimum
    /// @dev Can only be called after pool ends and if minimum not reached
    function claimRefund() external nonReentrant hasContribution {
        if (hasReachedMinimum()) revert PoolReachedMinimum();
        if (contributions[msg.sender].claimed) revert AlreadyClaimed();

        contributions[msg.sender].claimed = true;
        fundingToken.safeTransfer(msg.sender, contributions[msg.sender].amount);

        emit RefundClaimed(msg.sender, contributions[msg.sender].amount);
    }

    // 4. DEPLOYMENT FUNCTIONS (Sequential)
    /// @notice Deploys the token (first deployment function)
    /// @dev Can only be called after minimum contributions are reached and pool has ended
    function deployToken() external nonReentrant {
        if (!hasReachedMinimum()) revert PoolReachedMinimum();
        if (tokenDeployed) revert TokenAlreadyDeployed();
        if (block.timestamp < endTime) revert PoolNotEnded();

        proratedToken = IProratedToken(
            address(new ProratedToken(tokenName, tokenSymbol))
        );

        proratedToken.mint(address(this), tokenTotalSupply);
        tokenDeployed = true;
    }

    /// @notice Deploys the pair (second deployment function)
    /// @dev Can only be called after token is deployed
    function deployPair() external nonReentrant {
        if (!tokenDeployed) revert TokenNotDeployed();
        if (pairDeployed) revert PairAlreadyDeployed();

        // Create pair
        address pair = proswapFactory.createPair(
            address(proratedToken),
            address(fundingToken)
        );
        proswapPair = pair;
        pairDeployed = true;
    }

    /// @notice Seeds liquidity and calculates allocations (third deployment function)
    /// @dev Can only be called after pair is deployed
    function deployLiquidity() external nonReentrant {
        if (!pairDeployed) revert PairNotDeployed();
        if (liquidityDeployed) revert LiquidityAlreadyDeployed();

        // Seed liquidity
        proratedToken.approve(address(proswapRouter), type(uint256).max);
        fundingToken.safeApprove(address(proswapRouter), type(uint256).max);

        // For initial liquidity, use all available tokens
        uint256 fundingAmount = fundingToken.balanceOf(address(this));
        uint256 proratedAmount = proratedToken.balanceOf(address(this));

        proswapRouter.addLiquidity(
            address(proratedToken),
            address(fundingToken),
            proratedAmount,
            fundingAmount,
            proratedAmount,
            fundingAmount,
            address(this)
        );

        totalLPTokensReceived = ERC20(proswapPair).balanceOf(address(this));
        liquidityDeployed = true;

        // Calculate allocations based on total LP tokens received
        devTeamLPTokenAllocation =
            (totalLPTokensReceived * devTeamAllocationPercentage) /
            100;
        treasuryLPTokenAllocation =
            (totalLPTokensReceived * treasuryAllocationPercentage) /
            100;
    }

    /// @notice Deploy VENFT contract (anyone can call, first deployment wins)
    function deployVENFT() external {
        if (venftDeployed) revert VENFTAlreadyDeployed();
        if (!tokenDeployed) revert TokenNotDeployed();

        proratedVENFT = IProratedVENFT(
            address(new ProratedVENFT(address(proswapPair)))
        );
        venftDeployed = true;

        emit VENFTDeployed(address(proratedVENFT));
    }

    /// @notice Deploy Treasury contract (anyone can call, first deployment wins)
    function deployTreasury() external {
        if (treasuryDeployed) revert TreasuryAlreadyDeployed();
        if (!tokenDeployed) revert TokenNotDeployed();
        if (!pairDeployed) revert PairNotDeployed();
        if (!governorDeployed) revert GovernorNotDeployed();

        proratedTreasury = IProratedTreasury(
            address(
                new ProratedTreasury(
                    ProratedTreasury.TreasuryParams({
                        venft: address(proratedVENFT),
                        governor: address(proratedGovernor),
                        proswapPair: proswapPair,
                        owner: devTeam
                    })
                )
            )
        );
        treasuryDeployed = true;

        emit TreasuryDeployed(address(proratedTreasury));
    }

    /// @notice Deploy Governor contract (anyone can call, first deployment wins)
    function deployGovernor() external {
        if (governorDeployed) revert GovernorAlreadyDeployed();
        if (!venftDeployed) revert VENFTNotDeployed();
        if (!tokenDeployed) revert TokenNotDeployed();

        // Validate VENFT interface
        if (!IProratedVENFT(address(proratedVENFT)).validateInterface())
            revert InvalidVENFT();

        proratedGovernor = IProratedGovernor(
            address(new ProratedGovernor(address(proratedVENFT), address(this)))
        );
        governorDeployed = true;

        // Add pool as approved target
        proratedGovernor.addApprovedTarget(address(this));

        emit GovernorDeployed(address(proratedGovernor));
    }

    // 5. USER FUNCTIONS
    /// @notice Creates a veNFT position for a user based on their contribution
    /// @dev Can only be called after pool is finalized and if user has unclaimed contribution
    function createVENFTPosition() external nonReentrant {
        if (!tokenDeployed) revert TokenNotDeployed();

        Contribution memory userContribution = contributions[msg.sender];
        if (userContribution.amount == 0) revert NoContribution();
        if (userContribution.claimed) revert ContributionAlreadyClaimed();

        // Calculate user's LP token share based on their contribution shares
        uint256 userLPTokens = (userContribution.shares *
            totalLPTokensReceived) / totalShares;

        if (userLPTokens == 0) revert InvalidAmount();

        // Mark contribution as claimed
        contributions[msg.sender].claimed = true;

        // Approve VENFT to spend LP tokens
        ERC20(proswapPair).approve(address(proratedVENFT), userLPTokens);

        // Create veNFT position with user's lock duration
        uint256 lockDuration = userContribution.lockDuration * 1 weeks;
        uint256 tokenId = proratedVENFT.createLock(userLPTokens, lockDuration);

        // Transfer the veNFT to user
        proratedVENFT.transferFrom(address(this), msg.sender, tokenId);

        emit VENFTPositionCreated(
            msg.sender,
            tokenId,
            userLPTokens,
            lockDuration
        );
    }

    // 6. OWNER/GOVERNANCE FUNCTIONS
    /// @notice Allows dev team to withdraw remaining funding tokens after pool is finalized
    /// @dev Can only be called by dev team after pool has reached minimum and ended
    function devTeamFundsWithdraw() external onlyOwner {
        if (!tokenDeployed) revert TokenNotDeployed();

        fundingToken.safeTransfer(
            msg.sender,
            fundingToken.balanceOf(address(this))
        );
    }

    /// @notice Release dev team's LP tokens (governance function)
    /// @dev Can only be called by approved governor after successful proposal
    function releaseDevTeamLPTokens() external {
        if (msg.sender != address(proratedGovernor)) revert Unauthorized();
        if (!tokenDeployed) revert TokenNotDeployed();
        if (devTeamLPTokenAllocation == 0) revert NoTokensReserved();

        uint256 tokensToRelease = devTeamLPTokenAllocation;

        // Transfer LP tokens to dev team
        ERC20(proswapPair).safeTransfer(devTeam, tokensToRelease);

        // Create max-locked veNFT position for dev team (4 years)
        ERC20(proswapPair).approve(address(proratedVENFT), tokensToRelease);
        uint256 devTeamTokenId = proratedVENFT.createLock(
            tokensToRelease,
            4 * 365 * 86400
        );

        // Transfer the veNFT to dev team
        proratedVENFT.transferFrom(address(this), devTeam, devTeamTokenId);

        // Clear reserved amount
        devTeamLPTokenAllocation = 0;

        emit DevTeamTokensReleased(devTeam, tokensToRelease, devTeamTokenId);
    }

    /// @notice Release treasury's LP tokens (governance function)
    /// @dev Can be called by anyone after successful governance proposal
    function releaseTreasuryLPTokens() external {
        if (!tokenDeployed) revert TokenNotDeployed();
        if (treasuryLPTokenAllocation == 0) revert NoTokensReserved();

        uint256 tokensToRelease = treasuryLPTokenAllocation;

        // Create veNFT position for treasury (4 years max lock)
        ERC20(proswapPair).approve(address(proratedVENFT), tokensToRelease);
        uint256 treasuryTokenId = proratedVENFT.createLock(
            tokensToRelease,
            4 * 365 * 86400 // 4 years
        );

        // Transfer the veNFT to treasury
        proratedVENFT.transferFrom(
            address(this),
            address(proratedTreasury),
            treasuryTokenId
        );

        // Clear reserved amount
        treasuryLPTokenAllocation = 0;

        emit TreasuryTokensReleased(address(proratedTreasury), tokensToRelease);
    }
}
