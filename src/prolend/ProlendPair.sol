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
    error InsufficientLiquidity();
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

    // ===== ERC4626 Deposit/Withdraw Implementation =====

    /// @notice Deposit asset tokens and receive vault shares
    /// @param assets Amount of asset tokens to deposit
    /// @param receiver Address to receive the shares
    /// @return shares Number of shares minted
    function deposit(
        uint256 assets,
        address receiver
    ) public override nonReentrant returns (uint256 shares) {
        // Validate inputs
        if (receiver == address(0)) revert InvalidAddress();
        if (assets == 0) revert InvalidAmount();

        // Calculate shares to mint
        shares = convertToShares(assets);

        // Effects: Update vault accounting
        assetVault.addToVault(shares, assets);

        // Effects: Mint shares to receiver
        _mint(receiver, shares);

        // Interactions: Transfer assets from sender
        asset.safeTransferFrom(msg.sender, address(this), assets);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /// @notice Mint vault shares for a specific amount of assets
    /// @param shares Number of shares to mint
    /// @param receiver Address to receive the shares
    /// @return assets Amount of assets deposited
    function mint(
        uint256 shares,
        address receiver
    ) public override nonReentrant returns (uint256 assets) {
        // Validate inputs
        if (receiver == address(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidAmount();

        // Calculate assets needed
        assets = convertToAssets(shares);

        // Effects: Update vault accounting
        assetVault.addToVault(shares, assets);

        // Effects: Mint shares to receiver
        _mint(receiver, shares);

        // Interactions: Transfer assets from sender
        asset.safeTransferFrom(msg.sender, address(this), assets);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /// @notice Withdraw asset tokens by burning vault shares
    /// @param assets Amount of assets to withdraw
    /// @param receiver Address to receive the assets
    /// @param owner Address that owns the shares
    /// @return shares Number of shares burned
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256 shares) {
        // Validate inputs
        if (receiver == address(0)) revert InvalidAddress();
        if (assets == 0) revert InvalidAmount();

        // Calculate shares to burn
        shares = convertToShares(assets);

        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            uint256 allowed = allowance[owner][msg.sender];
            if (allowed != type(uint256).max) {
                allowance[owner][msg.sender] = allowed - shares;
            }
        }

        // Effects: Update vault accounting
        assetVault.removeFromVault(shares, assets);

        // Effects: Burn shares from owner
        _burn(owner, shares);

        // Interactions: Transfer assets to receiver
        asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /// @notice Redeem vault shares for asset tokens
    /// @param shares Number of shares to redeem
    /// @param receiver Address to receive the assets
    /// @param owner Address that owns the shares
    /// @return assets Amount of assets withdrawn
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override nonReentrant returns (uint256 assets) {
        // Validate inputs
        if (receiver == address(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidAmount();

        // Calculate assets to withdraw
        assets = convertToAssets(shares);

        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            uint256 allowed = allowance[owner][msg.sender];
            if (allowed != type(uint256).max) {
                allowance[owner][msg.sender] = allowed - shares;
            }
        }

        // Effects: Update vault accounting
        assetVault.removeFromVault(shares, assets);

        // Effects: Burn shares from owner
        _burn(owner, shares);

        // Interactions: Transfer assets to receiver
        asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    // ===== Placeholder Functions (to be implemented in subsequent tasks) =====

    // ===== Collateral Management =====

    /// @notice Add collateral to a borrower's position
    /// @param amount Amount of collateral tokens to add
    /// @param borrower Address of the borrower to credit the collateral
    function addCollateral(
        uint256 amount,
        address borrower
    ) external nonReentrant {
        // Validate inputs
        if (borrower == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        // Effects: Update state
        userCollateralBalance[borrower] += amount;
        totalCollateral += amount;

        // Interactions: Transfer collateral from sender
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        emit AddCollateral(borrower, amount);
    }

    /// @notice Remove collateral from caller's position
    /// @param amount Amount of collateral tokens to remove
    /// @param receiver Address to receive the collateral tokens
    function removeCollateral(
        uint256 amount,
        address receiver
    ) external nonReentrant {
        // Validate inputs
        if (receiver == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (userCollateralBalance[msg.sender] < amount)
            revert InsufficientCollateralBalance();

        // Effects: Update state
        userCollateralBalance[msg.sender] -= amount;
        totalCollateral -= amount;

        // Check solvency after collateral removal (if user has borrows)
        if (userBorrowShares[msg.sender] > 0) {
            if (!_isSolvent(msg.sender)) revert UserInsolvent();
        }

        // Interactions: Transfer collateral to receiver
        collateralToken.safeTransfer(receiver, amount);

        emit RemoveCollateral(msg.sender, amount);
    }

    // ===== Borrowing Functions =====

    /// @notice Borrow asset tokens against collateral
    /// @param borrowAmount Amount of asset tokens to borrow
    /// @param collateralAmount Amount of collateral to add (if any)
    /// @param receiver Address to receive the borrowed assets
    /// @return shares Number of borrow shares minted to the borrower
    function borrowAsset(
        uint256 borrowAmount,
        uint256 collateralAmount,
        address receiver
    ) external nonReentrant returns (uint256 shares) {
        // Validate inputs
        if (receiver == address(0)) revert InvalidAddress();
        if (borrowAmount == 0) revert InvalidAmount();

        // Add collateral if specified
        if (collateralAmount > 0) {
            // Transfer collateral from sender and credit to borrower
            collateralToken.safeTransferFrom(
                msg.sender,
                address(this),
                collateralAmount
            );
            userCollateralBalance[msg.sender] += collateralAmount;
            totalCollateral += collateralAmount;
            emit AddCollateral(msg.sender, collateralAmount);
        }

        // Check available liquidity
        uint256 availableAssets = assetVault.amount;
        if (availableAssets < borrowAmount) revert InsufficientLiquidity();

        // Calculate borrow shares to issue
        shares = borrowVault.toShares(borrowAmount, true); // Round up for borrows

        // Effects: Update borrow vault accounting
        borrowVault.addToVault(shares, borrowAmount);

        // Effects: Update user's borrow shares
        userBorrowShares[msg.sender] += shares;

        // Check solvency after borrow
        if (!_isSolvent(msg.sender)) revert UserInsolvent();

        // Effects: Update asset vault (reduce available assets)
        assetVault.removeFromVault(0, borrowAmount); // Only reduce amount, shares stay with lenders

        // Interactions: Transfer borrowed assets to receiver
        asset.safeTransfer(receiver, borrowAmount);

        emit Borrow(msg.sender, borrowAmount, shares);
    }

    /// @notice Repay borrowed assets using borrow shares
    /// @param shares Number of borrow shares to repay
    /// @param borrower Address of the borrower whose debt to repay
    /// @return amountRepaid Amount of asset tokens transferred for repayment
    function repayAsset(
        uint256 shares,
        address borrower
    ) external nonReentrant returns (uint256 amountRepaid) {
        // Validate inputs
        if (borrower == address(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidAmount();
        if (userBorrowShares[borrower] < shares)
            revert InsufficientBorrowBalance();

        // Calculate amount to repay based on shares (round up to favor protocol)
        amountRepaid = borrowVault.toAmount(shares, true);

        // Effects: Update borrow vault accounting
        borrowVault.removeFromVault(shares, amountRepaid);

        // Effects: Update user's borrow shares
        userBorrowShares[borrower] -= shares;

        // Effects: Update asset vault (add repaid assets back)
        assetVault.addToVault(0, amountRepaid); // Only add amount, shares stay with lenders

        // Interactions: Transfer repayment from sender
        asset.safeTransferFrom(msg.sender, address(this), amountRepaid);

        emit Repay(borrower, amountRepaid, shares);
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
        return _isSolvent(borrower);
    }

    /// @notice Internal solvency check function
    /// @param borrower Address of the borrower to check
    /// @return solvent True if the borrower is solvent (LTV below threshold)
    function _isSolvent(address borrower) internal view returns (bool solvent) {
        // If no borrow shares, always solvent
        if (userBorrowShares[borrower] == 0) return true;

        // Get current borrow amount in asset tokens
        uint256 borrowAmount = borrowVault.toAmount(
            userBorrowShares[borrower],
            false
        );
        if (borrowAmount == 0) return true;

        // Get collateral value in asset tokens
        uint256 collateralValue = getCollateralValue(
            userCollateralBalance[borrower]
        );

        // Check if LTV is below threshold
        // LTV = (borrowAmount * PRECISION) / collateralValue
        // Solvent if LTV <= LIQUIDATION_THRESHOLD
        if (collateralValue == 0) return false; // No collateral but has debt

        uint256 ltv = (borrowAmount * PRECISION) / collateralValue;
        solvent = ltv <= LIQUIDATION_THRESHOLD;
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

    // ===== Proswap Oracle Integration =====

    /// @notice Gets the current exchange rate from the Proswap 80/20 pool
    /// @return rate Price of collateral token in terms of asset token (scaled by 1e18)
    /// @dev Uses the weighted pool reserves to calculate spot price
    function getExchangeRate() public view returns (uint256 rate) {
        (uint112 reserve80, uint112 reserve20, ) = priceOracle.getReserves();

        // Handle case where no liquidity exists
        if (reserve80 == 0 || reserve20 == 0) {
            return 1e18; // Default to 1:1 if no liquidity
        }

        // Determine which token is asset vs collateral based on pair structure
        address token80 = priceOracle.token80();
        address token20 = priceOracle.token20();

        if (address(asset) == token80 && address(collateralToken) == token20) {
            // Asset is token80 (80% weight), Collateral is token20 (20% weight)
            // Price = how much asset (token80) per unit of collateral (token20)
            // For weighted pools: Price = (Reserve_collateral/Weight_collateral) / (Reserve_asset/Weight_asset)
            // Price = (reserve20/0.2) / (reserve80/0.8) = (reserve20 * 0.8) / (reserve80 * 0.2) = (reserve20 * 4) / reserve80
            rate = (uint256(reserve20) * 4 * 1e18) / uint256(reserve80);
        } else if (
            address(asset) == token20 && address(collateralToken) == token80
        ) {
            // Asset is token20 (20% weight), Collateral is token80 (80% weight)
            // Price = how much asset (token20) per unit of collateral (token80)
            // Price = (reserve80/0.8) / (reserve20/0.2) = (reserve80 * 0.2) / (reserve20 * 0.8) = reserve80 / (reserve20 * 4)
            rate = (uint256(reserve80) * 1e18) / (uint256(reserve20) * 4);
        } else {
            // This shouldn't happen if the pair is set up correctly, but fallback to 1:1
            rate = 1e18;
        }
    }

    /// @notice Calculates the value of collateral in terms of asset tokens
    /// @param collateralAmount Amount of collateral tokens
    /// @return assetValue Value in asset tokens (scaled to asset token decimals)
    function getCollateralValue(
        uint256 collateralAmount
    ) public view returns (uint256 assetValue) {
        uint256 exchangeRate = getExchangeRate();
        assetValue = (collateralAmount * exchangeRate) / 1e18;
    }

    /// @notice Calculates the collateral value of a borrow amount (for LTV calculations)
    /// @param borrowAmount Amount of asset tokens borrowed
    /// @return collateralValue Equivalent value in collateral tokens
    function getBorrowValue(
        uint256 borrowAmount
    ) public view returns (uint256 collateralValue) {
        uint256 exchangeRate = getExchangeRate();
        // To get collateral value, we need the inverse rate
        collateralValue = (borrowAmount * 1e18) / exchangeRate;
    }
}
