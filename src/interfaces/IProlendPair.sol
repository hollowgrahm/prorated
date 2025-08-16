// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @title IProlendPair Interface
/// @notice Interface for Prolend lending pair contracts
/// @dev Combines ERC4626 vault functionality with lending/borrowing features
interface IProlendPair {
    // ===== Events =====
    event Deposit(
        address indexed caller,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event Borrow(
        address indexed borrower,
        uint256 borrowAmount,
        uint256 collateralAmount
    );
    event Repay(address indexed borrower, uint256 repayAmount, uint256 shares);
    event AddCollateral(address indexed borrower, uint256 amount);
    event RemoveCollateral(address indexed borrower, uint256 amount);
    event Liquidate(
        address indexed borrower,
        address indexed liquidator,
        uint256 repayAmount,
        uint256 collateralSeized
    );
    event InterestAccrued(uint256 interestEarned, uint256 newRate);
    event LeveragedPosition(
        address indexed user,
        uint256 borrowAmount,
        uint256 totalCollateral
    );

    // ===== ERC4626 Vault Functions =====
    function asset() external view returns (address assetTokenAddress);
    function totalAssets() external view returns (uint256 totalManagedAssets);
    function convertToShares(
        uint256 assets
    ) external view returns (uint256 shares);
    function convertToAssets(
        uint256 shares
    ) external view returns (uint256 assets);
    function maxDeposit(
        address receiver
    ) external view returns (uint256 maxAssets);
    function previewDeposit(
        uint256 assets
    ) external view returns (uint256 shares);
    function deposit(
        uint256 assets,
        address receiver
    ) external returns (uint256 shares);
    function maxMint(
        address receiver
    ) external view returns (uint256 maxShares);
    function previewMint(uint256 shares) external view returns (uint256 assets);
    function mint(
        uint256 shares,
        address receiver
    ) external returns (uint256 assets);
    function maxWithdraw(
        address owner
    ) external view returns (uint256 maxAssets);
    function previewWithdraw(
        uint256 assets
    ) external view returns (uint256 shares);
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares);
    function maxRedeem(address owner) external view returns (uint256 maxShares);
    function previewRedeem(
        uint256 shares
    ) external view returns (uint256 assets);
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets);

    // ===== Lending/Borrowing Functions =====
    function borrowAsset(
        uint256 borrowAmount,
        uint256 collateralAmount,
        address receiver
    ) external;
    function repayAsset(
        uint256 shares,
        address borrower
    ) external returns (uint256 amountRepaid);
    function addCollateral(uint256 amount, address borrower) external;
    function removeCollateral(uint256 amount, address receiver) external;

    // ===== Leveraged Position Functions =====
    function leveragedPosition(
        uint256 borrowAmount,
        uint256 initialCollateral,
        uint256 minCollateralOut
    ) external returns (uint256 totalCollateral);

    // ===== Liquidation Functions =====
    function liquidate(
        uint256 shares,
        address borrower
    ) external returns (uint256 collateralSeized);

    // ===== Interest Rate Functions =====
    function addInterest() external returns (uint256 interestEarned);
    function getCurrentRate() external view returns (uint256);
    function getUtilization() external view returns (uint256);

    // ===== View Functions =====
    function assetToken() external view returns (address);
    function collateralToken() external view returns (address);
    function priceOracle() external view returns (address);
    function admin() external view returns (address);

    // Risk parameters
    function maxLTV() external view returns (uint256);
    function liquidationThreshold() external view returns (uint256);
    function liquidationFee() external view returns (uint256);

    // Interest rate parameters
    function minRate() external view returns (uint256);
    function vertexRate() external view returns (uint256);
    function maxRate() external view returns (uint256);
    function vertexUtilization() external view returns (uint256);

    // Accounting
    function totalAssetShares() external view returns (uint256);
    function totalAssetAmount() external view returns (uint256);
    function totalBorrowShares() external view returns (uint256);
    function totalBorrowAmount() external view returns (uint256);
    function totalCollateral() external view returns (uint256);

    // User balances
    function userCollateralBalance(
        address user
    ) external view returns (uint256);
    function userBorrowShares(address user) external view returns (uint256);
    function getUserBorrowAmount(address user) external view returns (uint256);

    // Solvency checks
    function isSolvent(address borrower) external view returns (bool);
    function getCollateralValue(
        uint256 collateralAmount
    ) external view returns (uint256);
    function getBorrowValue(
        uint256 borrowAmount
    ) external view returns (uint256);
}
