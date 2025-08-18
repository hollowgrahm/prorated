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
    IProswapPair public immutable proswapPair;

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
        uint256 collateralReceived,
        uint256 shares,
        uint256 debtRepaid
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
    error BorrowerSolvent();
    error InvalidAmount();
    error InvalidAddress();
    error LiquidationFailed();
    error SlippageTooHigh(uint256 expected, uint256 actual);

    // ===== Constructor =====

    /// @notice Creates a new Prolend lending pair
    /// @param _assetToken The token that can be lent/borrowed
    /// @param _collateralToken The collateral token
    /// @param _proswapPair The Proswap pair used for pricing (80/20 pool)
    constructor(
        address _assetToken,
        address _collateralToken,
        address _proswapPair
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
            _proswapPair == address(0)
        ) {
            revert InvalidAddress();
        }

        // Store immutable references
        collateralToken = ERC20(_collateralToken);
        proswapPair = IProswapPair(_proswapPair);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(receiver);
        _validateAmount(assets);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(receiver);
        _validateAmount(shares);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(receiver);
        _validateAmount(assets);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(receiver);
        _validateAmount(shares);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(borrower);
        _validateAmount(amount);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(receiver);
        _validateAmount(amount);
        if (userCollateralBalance[msg.sender] < amount)
            revert InsufficientCollateralBalance();

        // Effects: Update state
        userCollateralBalance[msg.sender] -= amount;
        totalCollateral -= amount;

        // Check solvency after collateral removal (if user has borrows)
        _validateSolvencyIfBorrowing(msg.sender);

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(receiver);
        _validateAmount(borrowAmount);

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
        if (assetVault.amount < borrowAmount) revert InsufficientLiquidity();

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
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAddress(borrower);
        _validateAmount(shares);
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

    // ===== Liquidation =====

    /// @notice Liquidate an insolvent borrower's position
    /// @param shares Number of borrow shares to liquidate
    /// @param borrower Address of the borrower to liquidate
    /// @return collateralReceived Amount of collateral tokens received by liquidator
    function liquidate(
        uint256 shares,
        address borrower
    ) external nonReentrant returns (uint256 collateralReceived) {
        // Accrue interest before liquidation
        _addInterest();

        // Validate inputs
        _validateAddress(borrower);
        _validateAmount(shares);
        if (userBorrowShares[borrower] < shares)
            revert InsufficientBorrowBalance();

        // Check if borrower is actually insolvent
        if (_isSolvent(borrower)) revert BorrowerSolvent();

        // Calculate liquidation amounts
        uint256 debtToRepay = borrowVault.toAmount(shares, true); // Round up to favor protocol
        uint256 borrowValue = getBorrowValue(debtToRepay);

        // Calculate collateral to seize (debt + 10% liquidation bonus)
        uint256 collateralValueToSeize = (borrowValue *
            (1e5 + LIQUIDATION_FEE)) / 1e5;

        // Convert collateral value back to collateral token amount using exchange rate
        collateralReceived =
            (collateralValueToSeize * 1e18) /
            getExchangeRate();

        // Ensure we don't seize more collateral than borrower has
        if (collateralReceived > userCollateralBalance[borrower]) {
            collateralReceived = userCollateralBalance[borrower];
        }

        // Effects: Update borrower's debt (via standard repayment accounting)
        borrowVault.removeFromVault(shares, debtToRepay);
        userBorrowShares[borrower] -= shares;
        assetVault.addToVault(0, debtToRepay); // Add repaid assets back to lenders

        // Effects: Update borrower's collateral
        userCollateralBalance[borrower] -= collateralReceived;
        totalCollateral -= collateralReceived;

        // Interactions: Transfer repayment from liquidator
        asset.safeTransferFrom(msg.sender, address(this), debtToRepay);

        // Interactions: Transfer collateral to liquidator
        collateralToken.safeTransfer(msg.sender, collateralReceived);

        emit Liquidate(borrower, collateralReceived, shares, debtToRepay);
    }

    // ===== Leveraged Positions =====

    /// @notice Open a leveraged position by borrowing and swapping for more collateral
    /// @param borrowAmount Amount of asset tokens to borrow
    /// @param initialCollateral Amount of initial collateral to add
    /// @param minCollateralOut Minimum collateral tokens expected from swap (slippage protection)
    /// @return totalCollateralAdded Total collateral tokens added to user's position
    function leveragedPosition(
        uint256 borrowAmount,
        uint256 initialCollateral,
        uint256 minCollateralOut
    ) external nonReentrant returns (uint256 totalCollateralAdded) {
        // Accrue interest before any operation
        _addInterest();

        // Validate inputs
        _validateAmount(borrowAmount);
        _validateAmount(minCollateralOut);

        // Check liquidity for borrow
        if (borrowAmount > assetVault.amount) revert InsufficientLiquidity();

        // Add initial collateral if provided
        if (initialCollateral > 0) {
            // Transfer initial collateral from user
            collateralToken.safeTransferFrom(
                msg.sender,
                address(this),
                initialCollateral
            );

            // Effects: Update user's collateral balance
            userCollateralBalance[msg.sender] += initialCollateral;
            totalCollateral += initialCollateral;

            emit AddCollateral(msg.sender, initialCollateral);
        }

        // Borrow asset tokens (they stay in this contract for swapping)
        uint256 borrowShares = borrowVault.toShares(borrowAmount, false);

        // Effects: Update borrow accounting
        borrowVault.addToVault(borrowShares, borrowAmount);
        userBorrowShares[msg.sender] += borrowShares;

        // Effects: Update asset vault (remove borrowed assets)
        assetVault.removeFromVault(0, borrowAmount);

        // Interactions: Swap borrowed assets for collateral via Proswap
        uint256 collateralReceived = _swapAssetForCollateral(
            borrowAmount,
            minCollateralOut
        );

        // Effects: Add swapped collateral to user's position
        userCollateralBalance[msg.sender] += collateralReceived;
        totalCollateral += collateralReceived;

        // Check that user remains solvent after leveraged position
        if (!_isSolvent(msg.sender)) revert UserInsolvent();

        totalCollateralAdded = initialCollateral + collateralReceived;

        emit LeveragedPosition(msg.sender, borrowAmount, totalCollateralAdded);
    }

    /// @notice Internal function to swap asset tokens for collateral via Proswap
    /// @param assetAmount Amount of asset tokens to swap
    /// @param minCollateralOut Minimum collateral expected (slippage protection)
    /// @return collateralReceived Amount of collateral tokens received
    function _swapAssetForCollateral(
        uint256 assetAmount,
        uint256 minCollateralOut
    ) internal returns (uint256 collateralReceived) {
        // Get initial balances for verification
        uint256 initialCollateralBalance = collateralToken.balanceOf(
            address(this)
        );

        // Get current reserves to determine which token gets which amount
        OracleData memory oracle = _getOracleData();

        // Determine swap direction and amounts
        uint256 amount0Out;
        uint256 amount1Out;

        if (address(asset) == oracle.token80) {
            amount0Out = 0;
            amount1Out =
                (assetAmount * uint256(oracle.reserve20)) /
                (uint256(oracle.reserve80) + assetAmount);
        } else {
            amount0Out =
                (assetAmount * uint256(oracle.reserve80)) /
                (uint256(oracle.reserve20) + assetAmount);
            amount1Out = 0;
        }

        // Transfer asset tokens to the pair
        asset.safeTransfer(address(proswapPair), assetAmount);

        // Perform the swap
        proswapPair.swap(amount0Out, amount1Out, address(this), "");

        // Verify collateral received
        uint256 finalCollateralBalance = collateralToken.balanceOf(
            address(this)
        );
        collateralReceived = finalCollateralBalance - initialCollateralBalance;

        // Check slippage protection
        if (collateralReceived < minCollateralOut) {
            revert SlippageTooHigh(minCollateralOut, collateralReceived);
        }
    }

    // ===== Interest Accrual =====

    /// @notice Accrue interest for all borrowers and update rates
    /// @return interestEarned Total interest earned by lenders
    function addInterest() external returns (uint256 interestEarned) {
        return _addInterest();
    }

    /// @notice Internal function to accrue interest, called before major operations
    /// @return interestEarned Amount of interest accrued
    function _addInterest() internal returns (uint256 interestEarned) {
        // Check if enough time has passed since last update
        uint256 timeElapsed = block.timestamp - lastInterestUpdate;
        if (timeElapsed == 0) {
            return 0; // No time elapsed, no interest to accrue
        }

        // Get current borrow amounts before interest accrual
        uint256 totalBorrowAmountBefore = borrowVault.amount;
        if (totalBorrowAmountBefore == 0) {
            // Update timestamp even if no borrows
            lastInterestUpdate = block.timestamp;
            return 0;
        }

        // Calculate new interest rate based on current utilization
        uint256 utilization = rateCalculator.calculateUtilization(
            totalBorrowAmountBefore,
            assetVault.amount
        );
        uint256 newRate = rateCalculator.calculateInterestRate(utilization);

        // Calculate compound interest for the time elapsed
        uint256 totalBorrowAmountAfter = rateCalculator
            .calculateCompoundInterest(
                totalBorrowAmountBefore,
                currentRate, // Use current rate for the elapsed period
                timeElapsed
            );

        // Calculate interest earned
        interestEarned = totalBorrowAmountAfter - totalBorrowAmountBefore;

        if (interestEarned > 0) {
            // Effects: Update borrow vault with accrued interest (only amount, shares stay same)
            borrowVault.addToVault(0, interestEarned);

            // Effects: Update asset vault with earned interest (increases lender yield)
            assetVault.addToVault(0, interestEarned);
        }

        // Effects: Update interest rate state
        currentRate = newRate;
        lastInterestUpdate = block.timestamp;

        emit InterestAccrued(interestEarned, newRate);
    }

    /// @notice Get the current interest rate
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

    function getUserBorrowAmount(address user) external view returns (uint256) {
        if (userBorrowShares[user] == 0) return 0;
        return borrowVault.toAmount(userBorrowShares[user], false);
    }

    // ===== Internal Helpers =====

    /// @notice Oracle data from Proswap pair
    struct OracleData {
        uint112 reserve80;
        uint112 reserve20;
        address token80;
        address token20;
    }

    /// @notice Gets all oracle data in one call
    /// @return data Oracle data struct with reserves and token addresses
    function _getOracleData() internal view returns (OracleData memory data) {
        (data.reserve80, data.reserve20, ) = proswapPair.getReserves();
        data.token80 = proswapPair.token80();
        data.token20 = proswapPair.token20();
    }

    /// @notice Validates that an amount is not zero
    /// @param amount The amount to validate
    function _validateAmount(uint256 amount) internal pure {
        if (amount == 0) revert InvalidAmount();
    }

    /// @notice Validates that an address is not zero
    /// @param addr The address to validate
    function _validateAddress(address addr) internal pure {
        if (addr == address(0)) revert InvalidAddress();
    }

    /// @notice Validates solvency if user has borrows
    /// @param user The user to check
    function _validateSolvencyIfBorrowing(address user) internal view {
        if (userBorrowShares[user] > 0) {
            if (!_isSolvent(user)) revert UserInsolvent();
        }
    }

    // ===== Proswap Oracle Integration =====

    /// @notice Gets the current exchange rate from the Proswap 80/20 pool
    /// @return rate Price of collateral token in terms of asset token (scaled by 1e18)
    /// @dev Uses the weighted pool reserves to calculate spot price
    function getExchangeRate() public view returns (uint256 rate) {
        OracleData memory oracle = _getOracleData();

        // Handle case where no liquidity exists
        if (oracle.reserve80 == 0 || oracle.reserve20 == 0) {
            return 1e18; // Default to 1:1 if no liquidity
        }

        if (
            address(asset) == oracle.token80 &&
            address(collateralToken) == oracle.token20
        ) {
            rate =
                (uint256(oracle.reserve20) * 4 * 1e18) /
                uint256(oracle.reserve80);
        } else if (
            address(asset) == oracle.token20 &&
            address(collateralToken) == oracle.token80
        ) {
            rate =
                (uint256(oracle.reserve80) * 1e18) /
                (uint256(oracle.reserve20) * 4);
        } else {
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
