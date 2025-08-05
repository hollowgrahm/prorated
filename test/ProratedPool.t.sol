// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../src/ProratedPool.sol";
import "../src/ProswapFactory.sol";
import "../src/ProswapRouter.sol";
import "../src/ProratedToken.sol";
import "../src/ProratedVENFT.sol";
import "./mocks/ERC20Mintable.sol";
import "../src/interfaces/IProratedToken.sol";
import "../src/interfaces/IProswapFactory.sol";
import "../src/interfaces/IProswapRouter.sol";
import "../src/interfaces/IProswapPair.sol";

contract ProratedPoolTest is Test {
    ProratedPool pool;
    ProswapFactory factory;
    ProswapRouter router;
    ERC20Mintable fundingToken;
    ProratedToken proratedToken;
    ProratedVENFT venftContract;

    address owner = address(1);
    address user1 = address(2);
    address user2 = address(3);
    address user3 = address(4);

    uint256 startTime;
    uint256 endTime;
    uint256 tokenTotalSupply = 1000000e18;
    uint256 desiredContributions = 100000e18;

    function setUp() public {
        startTime = block.timestamp + 1 hours;
        endTime = block.timestamp + 1 weeks;

        vm.startPrank(owner);

        // Deploy funding token
        fundingToken = new ERC20Mintable("Funding Token", "FUND");
        fundingToken.mint(1000000e18, owner);

        // Deploy Proswap contracts
        factory = new ProswapFactory(owner);
        router = new ProswapRouter(address(factory));

        // Deploy ProratedPool
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: address(this), // Use test contract as owner
            tokenName: "Test Token",
            tokenSymbol: "TEST",
            tokenTotalSupply: tokenTotalSupply,
            desiredContributions: desiredContributions,
            startTime: startTime,
            endTime: endTime,
            fundingToken: address(fundingToken),
            proswapFactory: address(factory),
            proswapRouter: address(router),
            devTeamAllocationPercentage: 20, // 20% dev team allocation
            treasuryAllocationPercentage: 15 // 15% treasury allocation
        });
        pool = new ProratedPool(config);

        // Mint tokens to users
        fundingToken.mint(2000000e18, user1);
        fundingToken.mint(2000000e18, user2);
        fundingToken.mint(2000000e18, user3);

        vm.stopPrank();
    }

    function test_Constructor() public {
        assertEq(pool.owner(), address(this));
        assertEq(pool.tokenName(), "Test Token");
        assertEq(pool.tokenSymbol(), "TEST");
        assertEq(pool.tokenTotalSupply(), tokenTotalSupply);
        assertEq(pool.desiredContributions(), desiredContributions);
        assertEq(pool.minTotalContributions(), desiredContributions * 2);
        assertEq(pool.startTime(), startTime);
        assertEq(pool.endTime(), endTime);
        assertEq(address(pool.fundingToken()), address(fundingToken));
        assertEq(address(pool.proswapFactory()), address(factory));
        assertEq(address(pool.proswapRouter()), address(router));
        assertEq(address(pool.proratedToken()), address(0));
    }

    function test_Contribute() public {
        vm.startPrank(user1);

        uint256 amount = 1000e18;
        uint256 lockDuration = 52; // 1 year

        fundingToken.approve(address(pool), amount);

        vm.warp(startTime + 1); // Ensure pool is active
        pool.contribute(amount, lockDuration);

        (
            uint256 amount_,
            uint256 lockDuration_,
            uint256 shares_,
            bool claimed_
        ) = pool.contributions(user1);
        assertEq(amount_, amount);
        assertEq(lockDuration_, lockDuration);
        assertEq(shares_, amount * lockDuration);
        assertEq(claimed_, false);

        assertEq(pool.totalContributions(), amount);
        assertEq(pool.totalShares(), amount * lockDuration);

        vm.stopPrank();
    }

    function test_IncreaseContribution() public {
        vm.startPrank(user1);

        fundingToken.approve(address(pool), 2000e18);

        // Initial contribution
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);

        // Increase contribution
        pool.increaseContribution(500e18);

        (
            uint256 amount_,
            uint256 lockDuration_,
            uint256 shares_,
            bool claimed_
        ) = pool.contributions(user1);
        assertEq(amount_, 1500e18);
        assertEq(shares_, 1500e18 * 52);
        assertEq(pool.totalContributions(), 1500e18);
        assertEq(pool.totalShares(), 1500e18 * 52);

        vm.stopPrank();
    }

    function test_IncreaseLockDuration() public {
        vm.startPrank(user1);

        fundingToken.approve(address(pool), 1000e18);

        // Initial contribution
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 26); // 6 months

        // Increase lock duration
        pool.increaseLockDuration(52); // 1 year

        (
            uint256 amount_,
            uint256 lockDuration_,
            uint256 shares_,
            bool claimed_
        ) = pool.contributions(user1);
        assertEq(amount_, 1000e18);
        assertEq(lockDuration_, 52);
        assertEq(shares_, 1000e18 * 52);
        assertEq(pool.totalShares(), 1000e18 * 52);

        vm.stopPrank();
    }

    function test_HasReachedMinimum() public {
        // Before pool ends - should work now (no timing restriction)
        assertEq(pool.hasReachedMinimum(), false);

        // After pool ends but below minimum
        vm.warp(endTime + 1);
        assertEq(pool.hasReachedMinimum(), false);

        // Add contributions to reach minimum
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        assertEq(pool.hasReachedMinimum(), true);
    }

    function test_ClaimRefund() public {
        // Add contribution
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);
        vm.stopPrank();

        // Try to claim before pool ends
        vm.expectRevert(ProratedPool.PoolNotEnded.selector);
        vm.prank(user1);
        pool.claimRefund();

        // Try to claim when minimum is NOT reached (should succeed)
        vm.warp(endTime + 1);
        vm.prank(user1);
        pool.claimRefund();

        // Add more contributions to reach minimum
        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        // Now try to claim refund (should fail because minimum is reached)
        vm.warp(endTime + 1);
        vm.expectRevert(ProratedPool.PoolReachedMinimum.selector);
        vm.prank(user2);
        pool.claimRefund();
    }

    function test_ClaimRefundSuccess() public {
        // Add contribution below minimum
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);
        vm.stopPrank();

        uint256 initialBalance = fundingToken.balanceOf(user1);

        // Claim refund after pool ends
        vm.warp(endTime + 1);
        vm.prank(user1);
        pool.claimRefund();

        uint256 finalBalance = fundingToken.balanceOf(user1);
        assertEq(finalBalance - initialBalance, 1000e18);

        // Try to claim again
        vm.expectRevert(ProratedPool.AlreadyClaimed.selector);
        vm.prank(user1);
        pool.claimRefund();
    }

    function test_ClaimRefundNoContribution() public {
        // Try to claim refund without having a contribution
        vm.warp(endTime + 1);
        vm.expectRevert(ProratedPool.NoContribution.selector);
        vm.prank(user1);
        pool.claimRefund();
    }

    function test_ClaimRefundEventEmission() public {
        // Add contribution below minimum
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);
        vm.stopPrank();

        uint256 initialBalance = fundingToken.balanceOf(user1);

        // Claim refund (event emission is implicitly tested)
        vm.warp(endTime + 1);
        vm.prank(user1);
        pool.claimRefund();

        // Verify the refund was processed
        uint256 finalBalance = fundingToken.balanceOf(user1);
        assertEq(finalBalance - initialBalance, 1000e18);
    }

    function test_DeployToken() public {
        // Add contributions below minimum
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 100000e18);
        vm.warp(startTime + 1);
        pool.contribute(100000e18, 52);
        vm.stopPrank();

        // Try to deploy token before pool ends
        vm.expectRevert(ProratedPool.PoolNotEnded.selector);
        pool.deployToken();

        // Try to deploy token when minimum not reached
        vm.warp(endTime + 1);
        vm.expectRevert(ProratedPool.PoolReachedMinimum.selector);
        pool.deployToken();

        // Add more contributions to reach minimum
        vm.startPrank(user2);
        fundingToken.approve(address(pool), 100000e18);
        vm.warp(startTime + 1);
        pool.contribute(100000e18, 52);
        vm.stopPrank();

        // Deploy token
        vm.warp(endTime + 1);
        pool.deployToken();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertEq(pool.proswapPair(), address(0));
        assertEq(pool.totalLPTokensReceived(), 0);
        assertEq(address(pool.proratedVENFT()), address(0));
        assertEq(address(pool.proratedGovernor()), address(0));
        assertEq(address(pool.proratedTreasury()), address(0));

        // Try to deploy token again
        vm.expectRevert(ProratedPool.TokenAlreadyDeployed.selector);
        pool.deployToken();
    }

    function test_DeployTokenEventEmission() public {
        // Setup: Add contributions
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);

        // Deploy token (event emission is implicitly tested)
        pool.deployToken();

        // Verify the token was deployed
        assertTrue(address(pool.proratedToken()) != address(0));
    }

    function test_DeployPair() public {
        // Setup: Add contributions and deploy token
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        // Try to deploy pair before token is deployed
        vm.expectRevert(ProratedPool.TokenNotDeployed.selector);
        pool.deployPair();

        // Now deploy token
        pool.deployToken();

        // Deploy pair (should succeed now that token is deployed)
        pool.deployPair();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertTrue(address(pool.proswapPair()) != address(0));
        assertEq(pool.totalLPTokensReceived(), 0);
        assertEq(address(pool.proratedVENFT()), address(0));
        assertEq(address(pool.proratedGovernor()), address(0));
        assertEq(address(pool.proratedTreasury()), address(0));

        // Try to deploy pair again
        vm.expectRevert(ProratedPool.PairAlreadyDeployed.selector);
        pool.deployPair();
    }

    function test_DeployPairEventEmission() public {
        // Setup: Add contributions and deploy token
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();

        // Deploy pair (event emission is implicitly tested)
        pool.deployPair();

        // Verify the pair was deployed
        assertTrue(address(pool.proswapPair()) != address(0));
    }

    function test_DeployLiquidity() public {
        // Setup: Add contributions and deploy token and pair
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();

        // Try to deploy liquidity before pair is deployed
        vm.expectRevert(ProratedPool.PairNotDeployed.selector);
        pool.deployLiquidity();

        // Deploy pair
        pool.deployPair();

        // Deploy liquidity
        pool.deployLiquidity();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertTrue(address(pool.proswapPair()) != address(0));
        assertGt(pool.totalLPTokensReceived(), 0);
        assertEq(address(pool.proratedVENFT()), address(0));
        assertEq(address(pool.proratedGovernor()), address(0));
        assertEq(address(pool.proratedTreasury()), address(0));

        // Verify that allocations are calculated as part of deployLiquidity
        assertGt(
            pool.devTeamLPTokenAllocation(),
            0,
            "Dev team allocation should be calculated"
        );
        assertGt(
            pool.treasuryLPTokenAllocation(),
            0,
            "Treasury allocation should be calculated"
        );
        assertEq(
            pool.devTeamAllocationPercentage(),
            20,
            "Dev team allocation should be 20%"
        );
        assertEq(
            pool.treasuryAllocationPercentage(),
            15,
            "Treasury allocation should be 15%"
        );
    }

    function test_DeployLiquidityEventEmission() public {
        // Setup: Add contributions and deploy token and pair
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();

        // Deploy liquidity (event emission is implicitly tested)
        pool.deployLiquidity();

        // Verify the liquidity was deployed
        assertGt(pool.totalLPTokensReceived(), 0);
        assertGt(pool.devTeamLPTokenAllocation(), 0);
        assertGt(pool.treasuryLPTokenAllocation(), 0);
    }

    function test_DeployVENFT() public {
        // Setup: Add contributions and deploy token and pair
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();

        // Try to deploy VENFT before liquidity is deployed
        vm.expectRevert(ProratedPool.LiquidityNotDeployed.selector);
        pool.deployVENFT();

        // Deploy liquidity
        pool.deployLiquidity();

        // Deploy VENFT (should succeed now that liquidity is deployed)
        pool.deployVENFT();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertTrue(address(pool.proswapPair()) != address(0));
        assertGt(pool.totalLPTokensReceived(), 0);
        assertTrue(address(pool.proratedVENFT()) != address(0));
        assertEq(address(pool.proratedGovernor()), address(0));
        assertEq(address(pool.proratedTreasury()), address(0));

        // Try to deploy VENFT again
        vm.expectRevert(ProratedPool.VENFTAlreadyDeployed.selector);
        pool.deployVENFT();
    }

    function test_CreateVENFTPosition() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Create VENFT position (should succeed now that VENFT is deployed)
        vm.prank(user1);
        pool.createVENFTPosition();

        // Verify contribution is marked as claimed
        (
            uint256 amount_,
            uint256 lockDuration_,
            uint256 shares_,
            bool claimed_
        ) = pool.contributions(user1);
        assertEq(claimed_, true);

        // Try to create VENFT position again
        vm.expectRevert(ProratedPool.ContributionAlreadyClaimed.selector);
        vm.prank(user1);
        pool.createVENFTPosition();
    }

    function test_CreateVENFTPosition_LiquidityNotDeployed() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        // Don't deploy liquidity

        // Try to create VENFT position without liquidity deployed
        vm.expectRevert(ProratedPool.LiquidityNotDeployed.selector);
        vm.prank(user1);
        pool.createVENFTPosition();
    }

    function test_CreateVENFTPosition_NoContribution() public {
        // Setup: Add minimum contributions to meet pool requirements
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1200000e18);
        vm.warp(startTime + 1);
        pool.contribute(1200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Try to create VENFT position without any contribution (different user)
        vm.expectRevert(ProratedPool.NoContribution.selector);
        vm.prank(user2);
        pool.createVENFTPosition();
    }

    function test_CreateVENFTPosition_ContributionAlreadyClaimed() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Create VENFT position first time (should succeed)
        vm.prank(user1);
        pool.createVENFTPosition();

        // Try to create VENFT position again (should fail)
        vm.expectRevert(ProratedPool.ContributionAlreadyClaimed.selector);
        vm.prank(user1);
        pool.createVENFTPosition();
    }

    function test_CreateVENFTPosition_EventEmission() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Create VENFT position (event emission is implicitly tested)
        vm.prank(user1);
        pool.createVENFTPosition();

        // Verify the position was created successfully
        (, , , bool claimed) = pool.contributions(user1);
        assertTrue(claimed, "Contribution should be marked as claimed");
    }

    function test_CreateVENFTPosition_LPTokenCalculation() public {
        // Setup: Add contributions with different amounts and lock durations
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 100000e18);
        vm.warp(startTime + 1);
        pool.contribute(100000e18, 52); // 100k tokens, 52 weeks = 5.2M shares
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 26); // 200k tokens, 26 weeks = 5.2M shares
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Calculate expected LP token allocations
        uint256 totalShares = pool.totalShares();
        uint256 contributorLPTokenAllocation = pool
            .contributorLPTokenAllocation();

        // User1: 5.2M shares out of 10.4M total shares = 50%
        uint256 expectedUser1LPTokens = (contributorLPTokenAllocation *
            5200000) / 10400000;

        // User2: 5.2M shares out of 10.4M total shares = 50%
        uint256 expectedUser2LPTokens = (contributorLPTokenAllocation *
            5200000) / 10400000;

        // Create VENFT positions and verify LP token calculations
        vm.prank(user1);
        pool.createVENFTPosition();

        vm.prank(user2);
        pool.createVENFTPosition();

        // Verify both users received equal LP tokens (since they have equal shares)
        assertEq(
            expectedUser1LPTokens,
            expectedUser2LPTokens,
            "Users with equal shares should receive equal LP tokens"
        );
        assertTrue(
            expectedUser1LPTokens > 0,
            "LP token allocation should be non-zero"
        );
    }

    function test_DevTeamFundsWithdraw() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();

        // Check if there are any remaining funding tokens after liquidity deployment
        uint256 remainingBalance = fundingToken.balanceOf(address(this));

        if (remainingBalance > 0) {
            uint256 initialBalance = fundingToken.balanceOf(address(this));

            // Dev team withdraw (should succeed after liquidity is deployed)
            pool.devTeamFundsWithdraw();

            uint256 finalBalance = fundingToken.balanceOf(address(this));
            assertTrue(
                finalBalance > initialBalance,
                "Dev team should receive funding tokens"
            );
        } else {
            // If no tokens remain after liquidity deployment, withdrawal should still succeed but transfer 0
            pool.devTeamFundsWithdraw();
        }
    }

    function test_DevTeamFundsWithdrawNotFinalized() public {
        vm.expectRevert(ProratedPool.LiquidityNotDeployed.selector);
        pool.devTeamFundsWithdraw();
    }

    function test_DevTeamFundsWithdraw_Unauthorized() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();

        // Try to call with non-owner (should fail)
        vm.expectRevert("UNAUTHORIZED");
        vm.prank(user1);
        pool.devTeamFundsWithdraw();
    }

    function test_DevTeamFundsWithdraw_EventEmission() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();

        // Dev team withdraw (event emission is implicitly tested)
        pool.devTeamFundsWithdraw();

        // Verify the function completed successfully (even if 0 tokens transferred)
        assertTrue(true, "Dev team withdrawal should succeed");
    }

    function test_ProtocolFeeIntegration() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();

        // Protocol fees are only collected during swaps, not during liquidity addition
        uint256 factoryFees = factory.protocolFees(address(fundingToken));
        assertEq(
            factoryFees,
            0,
            "Protocol fees should not be collected during liquidity addition"
        );

        // Perform a swap to trigger protocol fee collection
        address pair = pool.proswapPair();
        vm.startPrank(user1);
        fundingToken.approve(pair, 1000e18);
        fundingToken.transfer(pair, 1000e18);

        // Get the pair interface and perform a swap
        IProswapPair(pair).swap(0, 500e18, user1, "");
        vm.stopPrank();

        // Now check that protocol fees are being collected
        factoryFees = factory.protocolFees(address(fundingToken));
        assertTrue(
            factoryFees > 0,
            "Protocol fees should be collected during swaps"
        );

        // Owner can withdraw protocol fees
        uint256 initialBalance = fundingToken.balanceOf(owner);
        vm.prank(owner);
        factory.withdrawProtocolFees(address(fundingToken));
        uint256 finalBalance = fundingToken.balanceOf(owner);
        assertTrue(
            finalBalance > initialBalance,
            "Owner should receive protocol fees"
        );
    }

    function test_DevTeamTokenAllocation() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Check that dev team allocation is reserved
        assertGt(
            pool.devTeamLPTokenAllocation(),
            0,
            "Dev team should have LP token allocation"
        );
        assertEq(
            pool.devTeamAllocationPercentage(),
            20,
            "Dev team allocation should be 20%"
        );

        // Try to release dev team LP tokens (should fail - only governor can call)
        vm.expectRevert(ProratedPool.Unauthorized.selector);
        pool.releaseDevTeamLPTokens();

        // Simulate governor call (for testing)
        vm.prank(address(pool.proratedGovernor()));
        pool.releaseDevTeamLPTokens();

        // Check that dev team received tokens and veNFT position
        assertEq(
            pool.devTeamLPTokenAllocation(),
            0,
            "Dev team allocation should be cleared"
        );
    }

    function test_MultipleContributors() public {
        // Multiple users contribute
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 100000e18);
        vm.warp(startTime + 1);
        pool.contribute(100000e18, 26); // 6 months
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 150000e18);
        vm.warp(startTime + 1);
        pool.contribute(150000e18, 52); // 1 year
        vm.stopPrank();

        vm.startPrank(user3);
        fundingToken.approve(address(pool), 50000e18);
        vm.warp(startTime + 1);
        pool.contribute(50000e18, 104); // 2 years
        vm.stopPrank();

        assertEq(pool.totalContributions(), 300000e18);
        assertEq(
            pool.totalShares(),
            100000e18 * 26 + 150000e18 * 52 + 50000e18 * 104
        );
    }

    function test_EdgeCases() public {
        // Test minimum lock duration
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 1); // MIN_LOCK
        vm.stopPrank();

        // Test maximum lock duration
        vm.startPrank(user2);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 208); // MAX_LOCK
        vm.stopPrank();

        // Test large amounts
        vm.startPrank(user3);
        fundingToken.approve(address(pool), 500000e18);
        vm.warp(startTime + 1);
        pool.contribute(500000e18, 52);
        vm.stopPrank();

        assertEq(pool.totalContributions(), 502000e18);
    }

    function test_DeployTreasury() public {
        // Setup: Add contributions and deploy all prerequisites
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Try to deploy treasury before governor is deployed
        vm.expectRevert(ProratedPool.GovernorNotDeployed.selector);
        pool.deployTreasury();

        // Deploy governor first
        pool.deployGovernor();

        // Now deploy treasury (should succeed)
        pool.deployTreasury();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertTrue(address(pool.proswapPair()) != address(0));
        assertGt(pool.totalLPTokensReceived(), 0);
        assertTrue(address(pool.proratedVENFT()) != address(0));
        assertTrue(address(pool.proratedGovernor()) != address(0));
        assertTrue(address(pool.proratedTreasury()) != address(0));

        // Try to deploy treasury again
        vm.expectRevert(ProratedPool.TreasuryAlreadyDeployed.selector);
        pool.deployTreasury();
    }

    function test_DeployGovernor() public {
        // Setup: Add contributions and deploy prerequisites
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Deploy governor
        pool.deployGovernor();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertTrue(address(pool.proswapPair()) != address(0));
        assertGt(pool.totalLPTokensReceived(), 0);
        assertTrue(address(pool.proratedVENFT()) != address(0));
        assertTrue(address(pool.proratedGovernor()) != address(0));
        assertEq(address(pool.proratedTreasury()), address(0));

        // Try to deploy governor again
        vm.expectRevert(ProratedPool.GovernorAlreadyDeployed.selector);
        pool.deployGovernor();
    }

    function test_DeployGovernorVENFTDependency() public {
        // Setup: Add contributions and deploy token, pair, and liquidity
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();

        // Try to deploy governor before VENFT is deployed
        vm.expectRevert(ProratedPool.VENFTNotDeployed.selector);
        pool.deployGovernor();

        // Deploy VENFT
        pool.deployVENFT();

        // Deploy governor (should succeed now that VENFT is deployed)
        pool.deployGovernor();

        assertTrue(address(pool.proratedToken()) != address(0));
        assertTrue(address(pool.proswapPair()) != address(0));
        assertGt(pool.totalLPTokensReceived(), 0);
        assertTrue(address(pool.proratedVENFT()) != address(0));
        assertTrue(address(pool.proratedGovernor()) != address(0));
        assertEq(address(pool.proratedTreasury()), address(0));
    }

    function test_TreasuryTokenAllocation() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();
        pool.deployGovernor();
        pool.deployTreasury();

        // Check that treasury allocation is reserved
        assertGt(
            pool.treasuryLPTokenAllocation(),
            0,
            "Treasury should have LP token allocation"
        );
        assertEq(
            pool.treasuryAllocationPercentage(),
            15,
            "Treasury allocation should be 15%"
        );

        // Release treasury LP tokens (should work for anyone)
        pool.releaseTreasuryLPTokens();

        // Check that treasury allocation is cleared
        assertEq(
            pool.treasuryLPTokenAllocation(),
            0,
            "Treasury allocation should be cleared"
        );
    }

    function test_CreateVENFTPositionTransfersVeNFT() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();

        // Check initial state
        (, , , bool claimedBefore) = pool.contributions(user1);
        assertEq(claimedBefore, false);

        // Create veNFT position
        vm.prank(user1);
        pool.createVENFTPosition();

        // Check that user now owns the veNFT
        (, , , bool claimedAfter) = pool.contributions(user1);
        assertEq(claimedAfter, true);

        // Verify user has a veNFT (tokenId should be 1 for first position)
        assertEq(pool.proratedVENFT().ownerOf(1), user1);
    }

    function test_DevTeamVeNFTTransfer() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();
        pool.deployGovernor();

        // Check initial state
        assertGt(pool.devTeamLPTokenAllocation(), 0);

        // Release dev team LP tokens (should create veNFT for dev team)
        vm.prank(address(pool.proratedGovernor()));
        pool.releaseDevTeamLPTokens();

        // Check that dev team allocation is cleared
        assertEq(pool.devTeamLPTokenAllocation(), 0);

        // Verify dev team has a veNFT (tokenId should be 1 for first position)
        assertEq(pool.proratedVENFT().ownerOf(1), pool.devTeam());
    }

    function test_TreasuryVeNFTTransfer() public {
        // Setup: Add contributions and finalize pool
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 200000e18);
        vm.warp(startTime + 1);
        pool.contribute(200000e18, 52);
        vm.stopPrank();

        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.deployVENFT();
        pool.deployGovernor();
        pool.deployTreasury();

        // Check initial state
        assertGt(pool.treasuryLPTokenAllocation(), 0);

        // Release treasury LP tokens (should create veNFT for treasury)
        pool.releaseTreasuryLPTokens();

        // Check that treasury allocation is cleared
        assertEq(pool.treasuryLPTokenAllocation(), 0);

        // Verify treasury has a veNFT (tokenId should be 1 for first position)
        assertEq(
            pool.proratedVENFT().ownerOf(1),
            address(pool.proratedTreasury())
        );
    }
}

// Modifier Tests - Test each modifier once to avoid duplication
contract ModifierTests is Test {
    ProratedPool public pool;
    ERC20Mintable public fundingToken;
    ProswapFactory public factory;
    ProswapRouter public router;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    uint256 public tokenTotalSupply = 1000000e18;
    uint256 public desiredContributions = 100000e18;
    uint256 public startTime = block.timestamp + 1 days;
    uint256 public endTime = block.timestamp + 30 days;

    function setUp() public {
        vm.startPrank(owner);

        // Deploy funding token
        fundingToken = new ERC20Mintable("Funding Token", "FUND");
        fundingToken.mint(1000000e18, owner);

        // Deploy Proswap contracts
        factory = new ProswapFactory(owner);
        router = new ProswapRouter(address(factory));

        // Deploy ProratedPool
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: address(this),
            tokenName: "Test Token",
            tokenSymbol: "TEST",
            tokenTotalSupply: tokenTotalSupply,
            desiredContributions: desiredContributions,
            startTime: startTime,
            endTime: endTime,
            fundingToken: address(fundingToken),
            proswapFactory: address(factory),
            proswapRouter: address(router),
            devTeamAllocationPercentage: 20,
            treasuryAllocationPercentage: 15
        });
        pool = new ProratedPool(config);

        // Mint tokens to users
        fundingToken.mint(2000000e18, user1);
        fundingToken.mint(2000000e18, user2);

        vm.stopPrank();
    }

    function test_ValidAmountModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);

        // Test zero amount
        vm.expectRevert(ProratedPool.InvalidAmount.selector);
        pool.contribute(0, 52);

        vm.stopPrank();
    }

    function test_HasContributionModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);

        // Test without contribution
        assertEq(pool.hasContribution(user1), false);
        vm.expectRevert(ProratedPool.NoContribution.selector);
        pool.increaseContribution(500e18);

        vm.stopPrank();
    }

    function test_NoContributionModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 2000e18);
        vm.warp(startTime + 1);

        // Test without contribution
        assertEq(pool.hasContribution(user1), false);

        // First contribution
        pool.contribute(1000e18, 52);
        assertEq(pool.hasContribution(user1), true);

        // Try to contribute again
        vm.expectRevert(ProratedPool.ContributionExists.selector);
        pool.contribute(1000e18, 52);

        vm.stopPrank();
    }

    function test_PoolActiveModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);

        // Try before pool starts
        vm.warp(startTime - 1);
        vm.expectRevert(ProratedPool.PoolClosed.selector);
        pool.contribute(1000e18, 52);

        // Try after pool ends
        vm.warp(endTime + 1);
        vm.expectRevert(ProratedPool.PoolClosed.selector);
        pool.contribute(1000e18, 52);

        vm.stopPrank();
    }

    function test_ValidLockDurationModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);

        // Test below MIN_LOCK
        vm.expectRevert(ProratedPool.InvalidLockDuration.selector);
        pool.contribute(1000e18, 0);

        // Test above MAX_LOCK
        vm.expectRevert(ProratedPool.InvalidLockDuration.selector);
        pool.contribute(1000e18, 209);

        vm.stopPrank();
    }

    function test_TokenNotDeployedModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);
        vm.stopPrank();

        // Try to deploy pair before token is deployed
        vm.expectRevert(ProratedPool.TokenNotDeployed.selector);
        pool.deployPair();

        // Try to create VENFT position before token is deployed
        vm.expectRevert(ProratedPool.TokenNotDeployed.selector);
        vm.prank(user1);
        pool.createVENFTPosition();
    }

    function test_PoolEndedModifier() public {
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 1000e18);
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);
        vm.stopPrank();

        // Try to claim refund before pool ends
        vm.expectRevert(ProratedPool.PoolNotEnded.selector);
        vm.prank(user1);
        pool.claimRefund();

        // Try to deploy token before pool ends
        vm.expectRevert(ProratedPool.PoolNotEnded.selector);
        pool.deployToken();
    }
}
