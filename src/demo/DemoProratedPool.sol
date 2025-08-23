// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ProratedPoolStorage} from "../ProratedPoolStorage.sol";
import {IProratedToken} from "../interfaces/IProratedToken.sol";
import {IProswapFactory} from "../interfaces/IProswapFactory.sol";
import {IProswapRouter} from "../interfaces/IProswapRouter.sol";
import {IProratedVeNFT} from "../interfaces/IProratedVeNFT.sol";
import {IProratedGovernor} from "../interfaces/IProratedGovernor.sol";
import {IProratedTreasury} from "../interfaces/IProratedTreasury.sol";
import {ITokenDeployer} from "../interfaces/ITokenDeployer.sol";
import {IPairDeployer} from "../interfaces/IPairDeployer.sol";
import {ILiquidityDeployer} from "../interfaces/ILiquidityDeployer.sol";
import {IVeNFTDeployer} from "../interfaces/IVeNFTDeployer.sol";
import {IGovernorDeployer} from "../interfaces/IGovernorDeployer.sol";
import {ITreasuryDeployer} from "../interfaces/ITreasuryDeployer.sol";
import {IProlendDeployer} from "../interfaces/IProlendDeployer.sol";
import {ProratedToken} from "../ProratedToken.sol";
import {ProratedVeNFT} from "../ProratedVeNFT.sol";
import {ProratedGovernor} from "../ProratedGovernor.sol";
import {ProratedTreasury} from "../ProratedTreasury.sol";

contract DemoProratedPool is ProratedPoolStorage, Owned, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    // ============ DEMO TIME MANIPULATION ============
    uint256 public timeSkipped;
    uint256 public timeRewound;
    
    function _currentTime() internal view returns (uint256) {
        return block.timestamp + timeSkipped - timeRewound;
    }
    
    function skipTime(uint256 timeToSkip) external onlyOwner {
        timeSkipped += timeToSkip;
    }
    
    function rewindTime(uint256 timeToRewind) external onlyOwner {
        timeRewound += timeToRewind;
    }

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
        if (_currentTime() < startTime || _currentTime() > endTime)
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
        if (_currentTime() < endTime) revert PoolNotEnded();
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
        developer = config.owner;
        tokenName = config.tokenName;
        tokenSymbol = config.tokenSymbol;
        tokenTotalSupply = config.tokenTotalSupply;
        developmentFund = config.developmentFund;
        liquidityFund = config.liquidityFund;
        minTotalContributions = developmentFund + liquidityFund;
        startTime = config.startTime;
        endTime = config.endTime;
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
        developerPercent = config.developerPercent;
        treasuryPercent = config.treasuryPercent;
        daoPercent = config.daoPercent;
    }

    // ============ USER FUNCTIONS ============
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

        fundingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 shares = amount * lockDuration;

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

    function increaseContribution(
        uint256 amount
    ) external poolActive validAmount(amount) nonReentrant {
        if (!hasContribution(msg.sender)) revert NoContribution();

        fundingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 lockDuration = contributions[msg.sender].lockDuration;
        uint256 newShares = amount * lockDuration;

        contributions[msg.sender].amount += amount;
        contributions[msg.sender].shares += newShares;
        totalContributions += amount;
        totalShares += newShares;

        emit ContributionIncreased(msg.sender, amount, lockDuration, newShares);
    }

    function increaseLockDuration(
        uint256 newLockDuration
    ) external poolActive validLockDuration(newLockDuration) nonReentrant {
        if (!hasContribution(msg.sender)) revert NoContribution();

        uint256 oldShares = contributions[msg.sender].shares;
        uint256 userAmount = contributions[msg.sender].amount;
        uint256 oldLockDuration = contributions[msg.sender].lockDuration;

        if (newLockDuration <= oldLockDuration)
            revert LockDurationNotIncreased();

        uint256 newShares = newLockDuration * userAmount;
        totalShares = totalShares - oldShares + newShares;

        contributions[msg.sender].lockDuration = newLockDuration;
        contributions[msg.sender].shares = newShares;

        emit LockDurationIncreased(
            msg.sender,
            oldLockDuration,
            newLockDuration,
            oldShares,
            newShares
        );
    }

    // ============ VIEW FUNCTIONS ============
    function hasContribution(address user) public view returns (bool) {
        return contributions[user].amount > 0;
    }

    function hasReachedMinimum() public view returns (bool) {
        return totalContributions >= minTotalContributions;
    }

    function claimRefund() external poolEnded nonReentrant {
        if (!hasContribution(msg.sender)) revert NoContribution();
        if (hasReachedMinimum()) revert PoolReachedMinimum();
        if (contributions[msg.sender].claimed) revert AlreadyClaimed();

        contributions[msg.sender].claimed = true;
        fundingToken.safeTransfer(msg.sender, contributions[msg.sender].amount);

        emit RefundClaimed(msg.sender, contributions[msg.sender].amount);
    }

    // ============ DEPLOYMENT SEQUENCE ============
    function deployToken() external poolEnded {
        if (!hasReachedMinimum()) revert MinimumNotReached();
        if (address(proratedToken) != address(0)) revert TokenAlreadyDeployed();
        tokenDeployer.deployToken(address(this));
    }

    function deployPair() external tokenDeployed {
        if (proswapPair != address(0)) revert PairAlreadyDeployed();
        pairDeployer.deployPair(address(this));
    }

    function deployLiquidity() external {
        if (proswapPair == address(0)) revert PairNotDeployed();
        if (totalLPTokensReceived > 0) revert LiquidityAlreadyDeployed();
        liquidityDeployer.deployLiquidity(address(this));
    }

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

    function deployGovernor() external {
        if (address(proratedGovernor) != address(0))
            revert GovernorAlreadyDeployed();
        if (address(proratedVeNFT) == address(0)) revert VeNFTNotDeployed();
        governorDeployer.deployGovernor(address(this));
    }

    function deployTreasury() external {
        if (address(proratedTreasury) != address(0))
            revert TreasuryAlreadyDeployed();
        if (address(proratedGovernor) == address(0))
            revert GovernorNotDeployed();
        treasuryDeployer.deployTreasury(address(this));
    }

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

        ERC20(address(proratedToken)).safeTransfer(proswapPair, tokenAmount);
        fundingToken.safeTransfer(proswapPair, fundingAmount);
    }

    // ============ USER POSITION MANAGEMENT ============
    function createVeNFTPosition() external nonReentrant {
        if (address(proratedVeNFT) == address(0)) revert VeNFTNotDeployed();
        Contribution memory userContribution = contributions[msg.sender];

        if (!hasContribution(msg.sender)) revert NoContribution();
        if (userContribution.claimed) revert AlreadyClaimed();

        uint256 userLPTokens = (userContribution.shares * daoLPTokens) /
            totalShares;

        if (userLPTokens == 0) revert InvalidAmount();

        contributions[msg.sender].claimed = true;
        ERC20(proswapPair).approve(address(proratedVeNFT), userLPTokens);

        uint256 lockDuration = userContribution.lockDuration * WEEK;
        uint256 tokenId = proratedVeNFT.createLock(userLPTokens, lockDuration);

        proratedVeNFT.transferFrom(address(this), msg.sender, tokenId);

        emit VeNFTPositionCreated(
            msg.sender,
            tokenId,
            userLPTokens,
            lockDuration
        );
    }

    // ============ GOVERNANCE & WITHDRAWAL FUNCTIONS ============
    function developerFundsWithdraw() external onlyOwner {
        if (address(proratedVeNFT) == address(0)) revert VeNFTNotDeployed();

        fundingToken.safeTransfer(msg.sender, developmentFund);

        emit DeveloperFundsWithdrawn(msg.sender, developmentFund);
    }

    function createDeveloperVeNFT() external nonReentrant {
        if (address(proratedGovernor) == address(0))
            revert GovernorNotDeployed();
        if (msg.sender != address(proratedGovernor)) revert Unauthorized();
        if (developerLPTokens == 0) revert NoLPTokensReserved();

        uint256 allocation = developerLPTokens;
        developerLPTokens = 0;

        ERC20(proswapPair).approve(address(proratedVeNFT), allocation);
        uint256 developerTokenId = proratedVeNFT.createLock(
            allocation,
            MAX_LOCK * WEEK
        );

        proratedVeNFT.transferFrom(address(this), developer, developerTokenId);

        emit DeveloperTokensReleased(developer, allocation, developerTokenId);
    }

    function createTreasuryVeNFT() external nonReentrant {
        if (address(proratedTreasury) == address(0))
            revert TreasuryNotDeployed();

        if (treasuryLPTokens == 0) revert NoLPTokensReserved();

        uint256 allocationTreasury = treasuryLPTokens;
        treasuryLPTokens = 0;

        ERC20(proswapPair).approve(address(proratedVeNFT), allocationTreasury);
        uint256 treasuryTokenId = proratedVeNFT.createLock(
            allocationTreasury,
            MAX_LOCK * WEEK
        );

        proratedVeNFT.transferFrom(
            address(this),
            address(proratedTreasury),
            treasuryTokenId
        );

        emit TreasuryTokensReleased(
            address(proratedTreasury),
            allocationTreasury,
            treasuryTokenId
        );
    }
}
