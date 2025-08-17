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

    function testPlaceholderFunctions() public {
        // All placeholder functions should revert with "Not implemented"
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
    function getReserves() external view returns (uint112, uint112, uint32) {
        return (1000 ether, 200 ether, uint32(block.timestamp));
    }
}
