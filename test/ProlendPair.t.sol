// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../src/prolend/ProlendPair.sol";
import "../src/prolend/ProlendVault.sol";
import "../test/mocks/ERC20Mintable.sol";

contract ProlendPairTest is Test {
    ProlendPair public prolendPair;
    ERC20Mintable public assetToken;
    ERC20Mintable public collateralToken;

    address public user1 = address(0x1);
    address public user2 = address(0x2);

    // Mock Proswap pair for testing
    MockProswapPair public mockPair;

    function setUp() public {
        // Deploy mock tokens
        assetToken = new ERC20Mintable("Asset Token", "ASSET");
        collateralToken = new ERC20Mintable("Collateral Token", "COLL");

        // Deploy mock Proswap pair
        mockPair = new MockProswapPair();

        // Deploy ProlendPair
        prolendPair = new ProlendPair(
            address(assetToken),
            address(collateralToken),
            address(mockPair)
        );

        // Set up mock pair tokens (assume asset is token80, collateral is token20)
        mockPair.setTokens(address(assetToken), address(collateralToken));

        // Mint tokens for testing
        assetToken.mint(1000 ether, user1);
        assetToken.mint(1000 ether, user2);
        collateralToken.mint(1000 ether, user1);
        collateralToken.mint(1000 ether, user2);
    }

    function testConstructor() public {
        assertEq(prolendPair.assetToken(), address(assetToken));
        assertEq(prolendPair.getCollateralToken(), address(collateralToken));
        assertEq(prolendPair.getPriceOracle(), address(mockPair));

        // Check constants
        assertEq(prolendPair.maxLTV(), 75000);
        assertEq(prolendPair.liquidationThreshold(), 75000);
        assertEq(prolendPair.liquidationFee(), 10000);
    }

    function testTotalAssets() public {
        // Initially should be 0
        assertEq(prolendPair.totalAssets(), 0);

        // Total assets should match vault amount
        assertEq(prolendPair.totalAssetAmount(), 0);
        assertEq(prolendPair.totalAssetShares(), 0);
    }

    function testConvertToShares() public {
        // With empty vault, shares should equal assets (1:1)
        assertEq(prolendPair.convertToShares(100 ether), 100 ether);
        assertEq(prolendPair.convertToShares(1 ether), 1 ether);
        assertEq(prolendPair.convertToShares(0), 0);
    }

    function testConvertToAssets() public {
        // With empty vault, assets should equal shares (1:1)
        assertEq(prolendPair.convertToAssets(100 ether), 100 ether);
        assertEq(prolendPair.convertToAssets(1 ether), 1 ether);
        assertEq(prolendPair.convertToAssets(0), 0);
    }

    function testPreviewFunctions() public {
        // Preview functions should match convert functions for empty vault
        assertEq(
            prolendPair.previewDeposit(100 ether),
            prolendPair.convertToShares(100 ether)
        );
        assertEq(
            prolendPair.previewMint(100 ether),
            prolendPair.convertToAssets(100 ether)
        );
        assertEq(
            prolendPair.previewWithdraw(100 ether),
            prolendPair.convertToShares(100 ether)
        );
        assertEq(
            prolendPair.previewRedeem(100 ether),
            prolendPair.convertToAssets(100 ether)
        );
    }

    function testMaxFunctions() public {
        // Max deposit and mint should be unlimited
        assertEq(prolendPair.maxDeposit(user1), type(uint256).max);
        assertEq(prolendPair.maxMint(user1), type(uint256).max);

        // Max withdraw and redeem should be 0 for users with no balance
        assertEq(prolendPair.maxWithdraw(user1), 0);
        assertEq(prolendPair.maxRedeem(user1), 0);
    }

    function testInterestRateParameters() public {
        // Check that interest rate parameters are accessible
        assertTrue(prolendPair.minRate() > 0);
        assertTrue(prolendPair.vertexRate() > prolendPair.minRate());
        assertTrue(prolendPair.maxRate() > prolendPair.vertexRate());
        assertEq(prolendPair.vertexUtilization(), 80000); // 80%
    }

    function testUtilizationCalculation() public {
        // Initially should be 0% utilization
        assertEq(prolendPair.getUtilization(), 0);

        // Current rate should be minimum rate
        assertEq(prolendPair.getCurrentRate(), prolendPair.minRate());
    }

    function testSolvencyCheck() public {
        // Default placeholder should return true
        assertTrue(prolendPair.isSolvent(user1));
    }

    function testDeposit() public {
        uint256 depositAmount = 100 ether;

        // Approve and deposit
        vm.prank(user1);
        assetToken.approve(address(prolendPair), depositAmount);

        vm.prank(user1);
        uint256 shares = prolendPair.deposit(depositAmount, user1);

        // Check results
        assertEq(
            shares,
            depositAmount,
            "Should get 1:1 shares for first deposit"
        );
        assertEq(
            prolendPair.balanceOf(user1),
            depositAmount,
            "User should have shares"
        );
        assertEq(
            prolendPair.totalAssets(),
            depositAmount,
            "Total assets should match deposit"
        );
        assertEq(
            prolendPair.totalAssetAmount(),
            depositAmount,
            "Vault amount should match"
        );
        assertEq(
            prolendPair.totalAssetShares(),
            depositAmount,
            "Vault shares should match"
        );
        assertEq(
            assetToken.balanceOf(address(prolendPair)),
            depositAmount,
            "Contract should hold tokens"
        );
    }

    function testMint() public {
        uint256 shares = 50 ether;

        // Approve and mint
        vm.prank(user1);
        assetToken.approve(address(prolendPair), shares); // 1:1 ratio initially

        vm.prank(user1);
        uint256 assets = prolendPair.mint(shares, user1);

        // Check results
        assertEq(assets, shares, "Should need 1:1 assets for first mint");
        assertEq(
            prolendPair.balanceOf(user1),
            shares,
            "User should have shares"
        );
        assertEq(
            prolendPair.totalAssets(),
            assets,
            "Total assets should match"
        );
    }

    function testWithdraw() public {
        // First deposit
        uint256 depositAmount = 100 ether;
        vm.prank(user1);
        assetToken.approve(address(prolendPair), depositAmount);
        vm.prank(user1);
        prolendPair.deposit(depositAmount, user1);

        // Then withdraw half
        uint256 withdrawAmount = 50 ether;
        vm.prank(user1);
        uint256 shares = prolendPair.withdraw(withdrawAmount, user1, user1);

        // Check results
        assertEq(
            shares,
            withdrawAmount,
            "Should burn 1:1 shares for withdrawal"
        );
        assertEq(
            prolendPair.balanceOf(user1),
            depositAmount - withdrawAmount,
            "User should have remaining shares"
        );
        assertEq(
            prolendPair.totalAssets(),
            depositAmount - withdrawAmount,
            "Total assets should be reduced"
        );
        assertEq(
            assetToken.balanceOf(user1),
            1000 ether - depositAmount + withdrawAmount,
            "User should receive tokens"
        );
    }

    function testRedeem() public {
        // First deposit
        uint256 depositAmount = 100 ether;
        vm.prank(user1);
        assetToken.approve(address(prolendPair), depositAmount);
        vm.prank(user1);
        prolendPair.deposit(depositAmount, user1);

        // Then redeem half the shares
        uint256 redeemShares = 30 ether;
        vm.prank(user1);
        uint256 assets = prolendPair.redeem(redeemShares, user1, user1);

        // Check results
        assertEq(assets, redeemShares, "Should get 1:1 assets for redemption");
        assertEq(
            prolendPair.balanceOf(user1),
            depositAmount - redeemShares,
            "User should have remaining shares"
        );
        assertEq(
            prolendPair.totalAssets(),
            depositAmount - redeemShares,
            "Total assets should be reduced"
        );
    }

    function testDepositWithdrawRatio() public {
        // Multiple deposits to test share ratio
        vm.prank(user1);
        assetToken.approve(address(prolendPair), 200 ether);
        vm.prank(user1);
        prolendPair.deposit(100 ether, user1);

        vm.prank(user2);
        assetToken.approve(address(prolendPair), 200 ether);
        vm.prank(user2);
        prolendPair.deposit(50 ether, user2);

        // Check total state
        assertEq(
            prolendPair.totalAssets(),
            150 ether,
            "Total assets should be sum of deposits"
        );
        assertEq(
            prolendPair.balanceOf(user1),
            100 ether,
            "User1 should have 100 shares"
        );
        assertEq(
            prolendPair.balanceOf(user2),
            50 ether,
            "User2 should have 50 shares"
        );

        // Test proportional withdrawal
        vm.prank(user1);
        prolendPair.withdraw(25 ether, user1, user1);

        assertEq(
            prolendPair.totalAssets(),
            125 ether,
            "Total assets reduced by withdrawal"
        );
        assertEq(
            prolendPair.balanceOf(user1),
            75 ether,
            "User1 shares reduced"
        );
    }

    function testInvalidDeposits() public {
        // Test zero amount
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(ProlendPair.InvalidAmount.selector)
        );
        prolendPair.deposit(0, user1);

        // Test zero address receiver
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(ProlendPair.InvalidAddress.selector)
        );
        prolendPair.deposit(100 ether, address(0));
    }

    function testInvalidWithdrawals() public {
        // Test zero amount
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(ProlendPair.InvalidAmount.selector)
        );
        prolendPair.withdraw(0, user1, user1);

        // Test zero address receiver
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(ProlendPair.InvalidAddress.selector)
        );
        prolendPair.withdraw(100 ether, address(0), user1);
    }

    function testProswapOracle() public {
        // Test exchange rate calculation
        // Default: 1000 ether token80 (asset), 200 ether token20 (collateral)
        // Asset is token80, Collateral is token20
        // Rate = (reserve20 * 4) / reserve80 = (200 * 4) / 1000 = 0.8
        uint256 exchangeRate = prolendPair.getExchangeRate();
        assertEq(
            exchangeRate,
            0.8 ether,
            "Exchange rate should be 0.8 (collateral per asset)"
        );

        // Test collateral value calculation
        uint256 collateralAmount = 100 ether;
        uint256 assetValue = prolendPair.getCollateralValue(collateralAmount);
        assertEq(
            assetValue,
            80 ether,
            "100 collateral should be worth 80 asset tokens"
        );

        // Test borrow value calculation
        uint256 borrowAmount = 80 ether;
        uint256 collateralValue = prolendPair.getBorrowValue(borrowAmount);
        assertEq(
            collateralValue,
            100 ether,
            "80 asset borrow should require 100 collateral"
        );
    }

    function testOracleWithDifferentReserves() public {
        // Change reserves to test different exchange rates
        mockPair.setReserves(2000 ether, 100 ether); // More assets, less collateral

        // Rate = (reserve20 * 4) / reserve80 = (100 * 4) / 2000 = 0.2
        uint256 exchangeRate = prolendPair.getExchangeRate();
        assertEq(
            exchangeRate,
            0.2 ether,
            "Exchange rate should be 0.2 with new reserves"
        );

        // Test calculations with new rate
        uint256 collateralAmount = 100 ether;
        uint256 assetValue = prolendPair.getCollateralValue(collateralAmount);
        assertEq(
            assetValue,
            20 ether,
            "100 collateral should be worth 20 asset tokens"
        );
    }

    function testOracleNoLiquidity() public {
        // Test with no liquidity
        mockPair.setReserves(0, 0);

        uint256 exchangeRate = prolendPair.getExchangeRate();
        assertEq(
            exchangeRate,
            1 ether,
            "Should default to 1:1 with no liquidity"
        );
    }

    function testPlaceholderFunctions() public {
        // Remaining placeholder functions should revert with "Not implemented"
        vm.expectRevert("Not implemented");
        prolendPair.addCollateral(100 ether, user1);

        vm.expectRevert("Not implemented");
        prolendPair.removeCollateral(100 ether, user1);

        vm.expectRevert("Not implemented");
        prolendPair.borrowAsset(100 ether, 200 ether, user1);

        vm.expectRevert("Not implemented");
        prolendPair.repayAsset(100 ether, user1);

        vm.expectRevert("Not implemented");
        prolendPair.liquidate(100 ether, user1);

        vm.expectRevert("Not implemented");
        prolendPair.leveragedPosition(100 ether, 200 ether, 180 ether);

        vm.expectRevert("Not implemented");
        prolendPair.addInterest();
    }
}

// Mock Proswap pair for testing
contract MockProswapPair {
    address public token80;
    address public token20;
    uint112 private reserve80 = 1000 ether; // 80% token reserve
    uint112 private reserve20 = 200 ether; // 20% token reserve

    constructor() {
        // Will be set by test setup
    }

    function setTokens(address _token80, address _token20) external {
        token80 = _token80;
        token20 = _token20;
    }

    function setReserves(uint112 _reserve80, uint112 _reserve20) external {
        reserve80 = _reserve80;
        reserve20 = _reserve20;
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve80, reserve20, uint32(block.timestamp));
    }
}
