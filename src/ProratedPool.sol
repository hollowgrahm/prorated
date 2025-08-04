// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
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

contract ProratedPool is Owned, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    error PoolClosed();
    error InvalidLockDuration();
    error InvalidAmount();
    error ContributionExists();
    error NoContribution();
    error PoolNotEnded();
    error AlreadyClaimed();
    error PoolReachedMinimum();
    error PoolNotFinalized();
    error PoolAlreadyFinalized();
    error ContributionAlreadyClaimed();

    string public tokenName;
    string public tokenSymbol;
    uint256 public tokenTotalSupply;
    uint256 public desiredContributions;
    uint256 public minTotalContributions;
    uint256 public startTime;
    uint256 public endTime;

    ERC20 public fundingToken;
    IProswapFactory public proswapFactory;
    IProswapRouter public proswapRouter;
    IProratedToken public proratedToken;
    address public lpToken;

    IProratedVENFT public proratedVENFT;
    IProratedGovernor public proratedGovernor;
    IProratedTreasury public proratedTreasury;

    uint256 public totalContributions;
    uint256 public totalShares;
    uint256 public totalLPTokensReceived;
    uint256 public devTeamAllocationPercentage;
    uint256 public devTeamLPTokenAllocation;
    uint256 public treasuryAllocationPercentage;
    uint256 public treasuryLPTokenAllocation;

    // Deployment tracking
    bool public venftDeployed;
    bool public governorDeployed;

    uint256 public constant MIN_LOCK = 1;
    uint256 public constant MAX_LOCK = 208;

    address[] public contributors;
    mapping(address => Contribution) public contributions;

    struct Contribution {
        uint256 amount;
        uint256 lockDuration;
        uint256 shares;
        bool claimed;
    }

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

    constructor(
        address _owner,
        string memory _tokenName,
        string memory _tokenSymbol,
        uint256 _tokenTotalSupply,
        uint256 _desiredContributions,
        uint256 _startTime,
        uint256 _endTime,
        address _fundingToken,
        address _proswapFactory,
        address _proswapRouter,
        uint256 _devTeamAllocationPercentage,
        uint256 _treasuryAllocationPercentage
    ) Owned(_owner) {
        tokenName = _tokenName;
        tokenSymbol = _tokenSymbol;
        tokenTotalSupply = _tokenTotalSupply;
        desiredContributions = _desiredContributions;
        minTotalContributions = _desiredContributions * 2;
        startTime = _startTime;
        endTime = _endTime;
        fundingToken = ERC20(_fundingToken);
        proswapFactory = IProswapFactory(_proswapFactory);
        proswapRouter = IProswapRouter(_proswapRouter);
        devTeamAllocationPercentage = _devTeamAllocationPercentage;
        treasuryAllocationPercentage = _treasuryAllocationPercentage;
    }

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
        fundingToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 shares = amount * lockDuration;

        contributors.push(msg.sender);
        contributions[msg.sender] = Contribution({
            amount: amount,
            lockDuration: lockDuration,
            shares: shares,
            claimed: false
        });

        totalContributions += amount;
        totalShares += shares;

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

    /// @notice Deploys the token (first deployment function)
    /// @dev Can only be called after minimum contributions are reached and pool has ended
    function deployToken() external nonReentrant {
        if (!hasReachedMinimum()) revert PoolReachedMinimum();
        if (address(proratedToken) != address(0)) revert PoolAlreadyFinalized();
        if (block.timestamp < endTime) revert PoolNotEnded();

        proratedToken = IProratedToken(
            address(new ProratedToken("Prorated", "PRORATED"))
        );

        proratedToken.mint(address(this), tokenTotalSupply);
    }

    /// @notice Deploys the pair (second deployment function)
    /// @dev Can only be called after token is deployed
    function deployPair() external nonReentrant {
        if (address(proratedToken) == address(0)) revert PoolNotFinalized();
        if (address(lpToken) != address(0)) revert PoolAlreadyFinalized();

        // Create pair
        address pair = proswapFactory.createPair(
            address(proratedToken),
            address(fundingToken)
        );
        lpToken = pair;
    }

    /// @notice Seeds liquidity (third deployment function)
    /// @dev Can only be called after pair is deployed
    function deployLiquidity() external nonReentrant {
        if (address(lpToken) == address(0)) revert PoolNotFinalized();

        // Seed liquidity
        uint256 fundingLiquidity = totalContributions - desiredContributions;
        proratedToken.approve(address(proswapRouter), type(uint256).max);
        fundingToken.safeApprove(address(proswapRouter), type(uint256).max);

        proswapRouter.addLiquidity(
            address(proratedToken),
            address(fundingToken),
            tokenTotalSupply,
            fundingLiquidity,
            tokenTotalSupply,
            fundingLiquidity,
            address(this)
        );

        totalLPTokensReceived = ERC20(lpToken).balanceOf(address(this));
    }

    /// @notice Calculates and reserves token allocations (fourth deployment function)
    /// @dev Can only be called after liquidity is deployed
    function calculateAllocations() external nonReentrant {
        if (totalLPTokensReceived == 0) revert PoolNotFinalized();

        uint256 totalLPTokens = ERC20(lpToken).balanceOf(address(this));
        devTeamLPTokenAllocation =
            (totalLPTokens * devTeamAllocationPercentage) /
            100;
        treasuryLPTokenAllocation =
            (totalLPTokens * treasuryAllocationPercentage) /
            100;
    }

    /// @notice Creates a veNFT position for a user based on their contribution
    /// @dev Can only be called after pool is finalized and if user has unclaimed contribution
    function createVENFTPosition() external nonReentrant {
        if (address(proratedToken) == address(0)) revert PoolNotFinalized();

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
        ERC20(lpToken).approve(address(proratedVENFT), userLPTokens);

        // Create veNFT position with user's lock duration
        uint256 lockDuration = userContribution.lockDuration * 1 weeks;
        uint256 tokenId = proratedVENFT.createLock(userLPTokens, lockDuration);

        emit VENFTPositionCreated(
            msg.sender,
            tokenId,
            userLPTokens,
            lockDuration
        );
    }

    /// @notice Allows owner to withdraw remaining funding tokens after pool is finalized
    /// @dev Can only be called by owner after pool has reached minimum and ended
    function ownerWithdraw() external onlyOwner {
        if (address(proratedToken) == address(0)) revert PoolNotFinalized();

        fundingToken.safeTransfer(
            msg.sender,
            fundingToken.balanceOf(address(this))
        );
    }

    /// @notice Release dev team's LP tokens (governance function)
    /// @dev Can only be called by approved governor after successful proposal
    function releaseDevTeamTokens() external {
        require(
            msg.sender == address(proratedGovernor),
            "Only governor can call"
        );
        require(address(proratedToken) != address(0), "Token not deployed");
        require(devTeamLPTokenAllocation > 0, "No tokens reserved");

        uint256 tokensToRelease = devTeamLPTokenAllocation;

        // Transfer LP tokens to dev team (owner)
        ERC20(lpToken).safeTransfer(owner, tokensToRelease);

        // Create max-locked veNFT position for dev team (4 years)
        ERC20(lpToken).approve(address(proratedVENFT), tokensToRelease);
        uint256 devTeamTokenId = proratedVENFT.createLock(
            tokensToRelease,
            4 * 365 * 86400
        );

        // Clear reserved amount
        devTeamLPTokenAllocation = 0;

        emit DevTeamTokensReleased(owner, tokensToRelease, devTeamTokenId);
    }

    /// @notice Release treasury's LP tokens (governance function)
    /// @dev Can only be called by approved governor after successful proposal
    function releaseTreasuryTokens() external {
        require(
            msg.sender == address(proratedGovernor),
            "Only governor can call"
        );
        require(address(proratedToken) != address(0), "Token not deployed");
        require(treasuryLPTokenAllocation > 0, "No treasury tokens reserved");

        uint256 tokensToRelease = treasuryLPTokenAllocation;

        // Transfer LP tokens to treasury
        ERC20(lpToken).safeTransfer(address(proratedTreasury), tokensToRelease);

        // Create veNFT position for treasury (4 years max lock)
        proratedTreasury.createTreasuryVeNFTPosition(
            tokensToRelease,
            4 * 365 * 86400 // 4 years
        );

        // Clear reserved amount
        treasuryLPTokenAllocation = 0;

        emit TreasuryTokensReleased(address(proratedTreasury), tokensToRelease);
    }

    /// @notice Deploy VENFT contract (anyone can call, first deployment wins)
    function deployVENFT() external {
        require(!venftDeployed, "VENFT already deployed");
        require(address(proratedToken) != address(0), "Token not deployed");

        proratedVENFT = IProratedVENFT(
            address(new ProratedVENFT(address(lpToken)))
        );
        venftDeployed = true;

        emit VENFTDeployed(address(proratedVENFT));
    }

    /// @notice Deploy Governor contract (anyone can call, first deployment wins)
    function deployGovernor() external {
        require(!governorDeployed, "Governor already deployed");
        require(venftDeployed, "VENFT not deployed");
        require(address(proratedToken) != address(0), "Token not deployed");

        // Validate VENFT interface
        require(
            IProratedVENFT(address(proratedVENFT)).validateInterface(),
            "Invalid VENFT"
        );

        proratedGovernor = IProratedGovernor(
            address(new ProratedGovernor(address(proratedVENFT), address(this)))
        );
        governorDeployed = true;

        // Add pool as approved target
        proratedGovernor.addApprovedTarget(address(this));

        emit GovernorDeployed(address(proratedGovernor));
    }

    /// @notice Get current deployment status
    /// @return tokenDeployed Whether the token has been deployed
    /// @return pairDeployed Whether the pair has been deployed
    /// @return venftDeployed_ Whether the VENFT has been deployed
    /// @return governorDeployed_ Whether the governor has been deployed
    function getDeploymentStatus()
        external
        view
        returns (
            bool tokenDeployed,
            bool pairDeployed,
            bool venftDeployed_,
            bool governorDeployed_
        )
    {
        return (
            address(proratedToken) != address(0),
            address(lpToken) != address(0),
            address(proratedVENFT) != address(0),
            address(proratedGovernor) != address(0)
        );
    }
}
