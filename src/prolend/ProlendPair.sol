// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {ERC4626} from "lib/solmate/src/tokens/ERC4626.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";

import {VaultAccount, ProlendVault} from "./ProlendVault.sol";
import {ProlendInterestRate} from "./ProlendInterestRate.sol";
import {IProlendPair} from "../interfaces/IProlendPair.sol";
import {IProswapPair} from "../interfaces/IProswapPair.sol";
import {IProswapRouter} from "../interfaces/IProswapRouter.sol";
import {IERC20} from "../interfaces/IERC20.sol";

/// @title ProlendPair
/// @notice A lending pair contract that enables borrowing and lending with collateral
/// @dev Implements ERC4626 vault standard for the asset token, with additional borrowing functionality
/// @author Prorated Protocol, inspired by Frax Finance
contract ProlendPair is ERC4626, ReentrancyGuard {
    using SafeTransferLib for ERC20;
    using ProlendVault for VaultAccount;

    // ===== Constants =====

    /// @notice Maximum LTV allowed (75%)
    uint256 public constant MAX_LTV = 75000; // 75% in 1e5 precision

    /// @notice Liquidation threshold (75% - same as LTV for simplicity)
    uint256 public constant LIQUIDATION_THRESHOLD = 75000; // 75% in 1e5 precision

    /// @notice Liquidation fee (10%)
    uint256 public constant LIQUIDATION_FEE = 10000; // 10% in 1e5 precision

    /// @notice Precision for percentage calculations
    uint256 public constant PRECISION = 1e5;

    // ===== Immutable State =====

    /// @notice The collateral token
    ERC20 public immutable collateralToken;

    /// @notice Proswap pair used for price oracle (80/20 pool)
    IProswapPair public immutable priceOracle;

    /// @notice Interest rate calculator contract
    ProlendInterestRate public immutable rateCalculator;

    // ===== Vault Accounting =====

    /// @notice Asset vault account (shares and amounts for lending)
    VaultAccount public assetVault;

    /// @notice Borrow vault account (shares and amounts for borrowing)
    VaultAccount public borrowVault;

    /// @notice Total collateral deposited across all users
    uint256 public totalCollateral;

    // ===== User Balances =====

    /// @notice User collateral balances
    mapping(address => uint256) public userCollateralBalance;

    /// @notice User borrow shares
    mapping(address => uint256) public userBorrowShares;

    // ===== Interest Rate State =====

    /// @notice Last time interest was accrued
    uint256 public lastInterestUpdate;

    /// @notice Current interest rate per second
    uint256 public currentRate;

    // ===== Events =====

    event AddCollateral(address indexed user, uint256 amount);
    event RemoveCollateral(address indexed user, uint256 amount);
    event Borrow(
        address indexed borrower,
        uint256 borrowAmount,
        uint256 shares
    );
    event Repay(address indexed borrower, uint256 repayAmount, uint256 shares);
    event Liquidate(
        address indexed borrower,
        address indexed liquidator,
        uint256 repayShares,
        uint256 collateralSeized
    );
    event InterestAccrued(uint256 interestEarned, uint256 newRate);
    event LeveragedPosition(
        address indexed user,
        uint256 borrowAmount,
        uint256 finalCollateral
    );

    // ===== Errors =====

    error InsufficientCollateral();
    error InsufficientBorrowBalance();
    error InsufficientCollateralBalance();
    error UserSolvent();
    error UserInsolvent();
    error InvalidAmount();
    error InvalidAddress();
    error LiquidationFailed();

    // ===== Constructor =====

    /// @notice Creates a new Prolend lending pair
    /// @param _assetToken The token that can be lent/borrowed
    /// @param _collateralToken The collateral token
    /// @param _priceOracle The Proswap pair used for pricing (80/20 pool)
    constructor(
        address _assetToken,
        address _collateralToken,
        address _priceOracle
    )
        ERC4626(
            ERC20(_assetToken),
            string(abi.encodePacked("Prolend ", ERC20(_assetToken).name())),
            string(abi.encodePacked("p", ERC20(_assetToken).symbol()))
        )
    {
        // Validate inputs
        if (
            _assetToken == address(0) ||
            _collateralToken == address(0) ||
            _priceOracle == address(0)
        ) {
            revert InvalidAddress();
        }

        // Store immutable references
        collateralToken = ERC20(_collateralToken);
        priceOracle = IProswapPair(_priceOracle);

        // Deploy interest rate calculator
        rateCalculator = new ProlendInterestRate();

        // Initialize interest rate state
        lastInterestUpdate = block.timestamp;
        currentRate = rateCalculator.MIN_RATE(); // Start at minimum rate
    }

    // ===== View Functions =====

    /// @notice Returns the total assets managed by the vault
    /// @return Total amount of asset tokens
    function totalAssets() public view override returns (uint256) {
        return assetVault.amount;
    }

    /// @notice Convert asset amount to vault shares
    /// @param assets Amount of assets to convert
    /// @return shares Number of shares for the asset amount
    function convertToShares(
        uint256 assets
    ) public view override returns (uint256 shares) {
        return assetVault.toShares(assets, false);
    }

    /// @notice Convert vault shares to asset amount
    /// @param shares Number of shares to convert
    /// @return assets Amount of assets for the shares
    function convertToAssets(
        uint256 shares
    ) public view override returns (uint256 assets) {
        return assetVault.toAmount(shares, false);
    }

    /// @notice Maximum amount of assets that can be deposited
    /// @return Maximum deposit amount (no limit for now)
    function maxDeposit(address) public pure override returns (uint256) {
        return type(uint256).max;
    }

    /// @notice Maximum number of shares that can be minted
    /// @return Maximum mint amount (no limit for now)
    function maxMint(address) public pure override returns (uint256) {
        return type(uint256).max;
    }

    /// @notice Maximum amount of assets that can be withdrawn
    /// @param account Address of the account
    /// @return Maximum withdrawal amount (their balance)
    function maxWithdraw(
        address account
    ) public view override returns (uint256) {
        return convertToAssets(balanceOf[account]);
    }

    /// @notice Maximum number of shares that can be redeemed
    /// @param account Address of the account
    /// @return Maximum redeem amount (their balance)
    function maxRedeem(address account) public view override returns (uint256) {
        return balanceOf[account];
    }

    /// @notice Preview deposit to calculate shares
    /// @param assets Amount of assets to deposit
    /// @return shares Number of shares that would be minted
    function previewDeposit(
        uint256 assets
    ) public view override returns (uint256 shares) {
        return convertToShares(assets);
    }

    /// @notice Preview mint to calculate assets needed
    /// @param shares Number of shares to mint
    /// @return assets Amount of assets needed
    function previewMint(
        uint256 shares
    ) public view override returns (uint256 assets) {
        return convertToAssets(shares);
    }

    /// @notice Preview withdraw to calculate shares needed
    /// @param assets Amount of assets to withdraw
    /// @return shares Number of shares needed
    function previewWithdraw(
        uint256 assets
    ) public view override returns (uint256 shares) {
        return convertToShares(assets);
    }

    /// @notice Preview redeem to calculate assets received
    /// @param shares Number of shares to redeem
    /// @return assets Amount of assets that would be received
    function previewRedeem(
        uint256 shares
    ) public view override returns (uint256 assets) {
        return convertToAssets(shares);
    }

    // ===== Placeholder Functions (to be implemented in subsequent tasks) =====

    /// @notice Placeholder for addCollateral function
    function addCollateral(uint256 amount, address borrower) external {
        // TODO: Implement in collateral management task
        revert("Not implemented");
    }

    /// @notice Placeholder for removeCollateral function
    function removeCollateral(uint256 amount, address receiver) external {
        // TODO: Implement in collateral management task
        revert("Not implemented");
    }

    /// @notice Placeholder for borrowAsset function
    function borrowAsset(
        uint256 borrowAmount,
        uint256 collateralAmount,
        address receiver
    ) external {
        // TODO: Implement in borrowing task
        revert("Not implemented");
    }

    /// @notice Placeholder for repayAsset function
    function repayAsset(
        uint256 shares,
        address borrower
    ) external returns (uint256) {
        // TODO: Implement in repay task
        revert("Not implemented");
    }

    /// @notice Placeholder for liquidate function
    function liquidate(
        uint256 shares,
        address borrower
    ) external returns (uint256) {
        // TODO: Implement in liquidation task
        revert("Not implemented");
    }

    /// @notice Placeholder for leveragedPosition function
    function leveragedPosition(
        uint256 borrowAmount,
        uint256 initialCollateral,
        uint256 minCollateralOut
    ) external returns (uint256) {
        // TODO: Implement in leveraged positions task
        revert("Not implemented");
    }

    /// @notice Placeholder for addInterest function
    function addInterest() external returns (uint256) {
        // TODO: Implement in interest accrual task
        revert("Not implemented");
    }

    /// @notice Placeholder for price oracle functions
    function getCurrentRate() external view returns (uint256) {
        return currentRate;
    }

    function getUtilization() external view returns (uint256) {
        return
            rateCalculator.calculateUtilization(
                borrowVault.amount,
                assetVault.amount
            );
    }

    function isSolvent(address borrower) external view returns (bool) {
        // TODO: Implement in solvency task
        return true; // Placeholder
    }

    // ===== Interface Implementation Getters =====

    function assetToken() external view returns (address) {
        return address(asset);
    }

    function getCollateralToken() external view returns (address) {
        return address(collateralToken);
    }

    function getPriceOracle() external view returns (address) {
        return address(priceOracle);
    }

    function maxLTV() external pure returns (uint256) {
        return MAX_LTV;
    }

    function liquidationThreshold() external pure returns (uint256) {
        return LIQUIDATION_THRESHOLD;
    }

    function liquidationFee() external pure returns (uint256) {
        return LIQUIDATION_FEE;
    }

    function minRate() external view returns (uint256) {
        return rateCalculator.MIN_RATE();
    }

    function vertexRate() external view returns (uint256) {
        return rateCalculator.VERTEX_RATE();
    }

    function maxRate() external view returns (uint256) {
        return rateCalculator.MAX_RATE();
    }

    function vertexUtilization() external view returns (uint256) {
        return rateCalculator.VERTEX_UTILIZATION();
    }

    function totalAssetShares() external view returns (uint256) {
        return assetVault.shares;
    }

    function totalAssetAmount() external view returns (uint256) {
        return assetVault.amount;
    }

    function totalBorrowShares() external view returns (uint256) {
        return borrowVault.shares;
    }

    function totalBorrowAmount() external view returns (uint256) {
        return borrowVault.amount;
    }

    function getUserBorrowAmount(address user) external view returns (uint256) {
        if (userBorrowShares[user] == 0) return 0;
        return borrowVault.toAmount(userBorrowShares[user], false);
    }

    function getCollateralValue(
        uint256 collateralAmount
    ) external view returns (uint256) {
        // TODO: Implement proper price oracle in oracle task
        return collateralAmount; // Placeholder 1:1 pricing
    }

    function getBorrowValue(
        uint256 borrowAmount
    ) external view returns (uint256) {
        // TODO: Implement proper price oracle in oracle task
        return borrowAmount; // Placeholder 1:1 pricing
    }
}
