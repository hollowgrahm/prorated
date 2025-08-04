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
        pool = new ProratedPool(
            address(this), // Use test contract as owner
            "Test Token",
            "TEST",
            tokenTotalSupply,
            desiredContributions,
            startTime,
            endTime,
            address(fundingToken),
            address(factory),
            address(router),
            20, // 20% dev team allocation
            15 // 15% treasury allocation
        );

        // Mint tokens to users
        fundingToken.mint(500000e18, user1);
        fundingToken.mint(500000e18, user2);
        fundingToken.mint(500000e18, user3);

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
        (
            bool tokenDeployed,
            bool pairDeployed,
            bool venftDeployed,
            bool governorDeployed
        ) = pool.getDeploymentStatus();
        assertEq(tokenDeployed, false);
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
        assertEq(pool.contributors(0), user1);

        vm.stopPrank();
    }

    function test_ContributeInvalidAmount() public {
        vm.startPrank(user1);

        fundingToken.approve(address(pool), 1000e18);

        vm.warp(startTime + 1); // Ensure pool is active
        vm.expectRevert(ProratedPool.InvalidAmount.selector);
        pool.contribute(0, 52);

        vm.stopPrank();
    }

    function test_ContributeInvalidLockDuration() public {
        vm.startPrank(user1);

        fundingToken.approve(address(pool), 1000e18);

        vm.warp(startTime + 1); // Ensure pool is active
        vm.expectRevert(ProratedPool.InvalidLockDuration.selector);
        pool.contribute(1000e18, 0); // Below MIN_LOCK

        vm.expectRevert(ProratedPool.InvalidLockDuration.selector);
        pool.contribute(1000e18, 209); // Above MAX_LOCK

        vm.stopPrank();
    }

    function test_ContributePoolClosed() public {
        vm.startPrank(user1);

        fundingToken.approve(address(pool), 1000e18);

        // Try to contribute before start time
        vm.warp(startTime - 1);
        vm.expectRevert(ProratedPool.PoolClosed.selector);
        pool.contribute(1000e18, 52);

        // Try to contribute after end time
        vm.warp(endTime + 1);
        vm.expectRevert(ProratedPool.PoolClosed.selector);
        pool.contribute(1000e18, 52);

        vm.stopPrank();
    }

    function test_ContributeAlreadyExists() public {
        vm.startPrank(user1);

        fundingToken.approve(address(pool), 2000e18);

        // First contribution
        vm.warp(startTime + 1);
        pool.contribute(1000e18, 52);

        // Try to contribute again
        vm.expectRevert(ProratedPool.ContributionExists.selector);
        pool.contribute(1000e18, 52);

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
        // Before pool ends
        vm.expectRevert(ProratedPool.PoolNotEnded.selector);
        pool.hasReachedMinimum();

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

    function test_FinalizePool() public {
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

        // Deploy token, pair, liquidity, and calculate allocations
        vm.warp(endTime + 1);
        pool.deployToken();
        pool.deployPair();
        pool.deployLiquidity();
        pool.calculateAllocations();

        (
            bool tokenDeployed,
            bool pairDeployed,
            bool venftDeployed,
            bool governorDeployed
        ) = pool.getDeploymentStatus();
        assertEq(tokenDeployed, true);
        assertTrue(address(pool.proratedToken()) != address(0));
        // Note: Pair, VENFT, and Governor are now deployed separately
        assertEq(pairDeployed, false);
        assertEq(venftDeployed, false);
        assertEq(governorDeployed, false);

        // Try to deploy token again
        vm.expectRevert(ProratedPool.PoolAlreadyFinalized.selector);
        pool.deployToken();
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
        pool.calculateAllocations();

        // Create VENFT position (should succeed now that token is deployed)
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

    function test_OwnerWithdraw() public {
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
        pool.calculateAllocations();

        uint256 initialBalance = fundingToken.balanceOf(address(this));

        // Owner withdraw
        pool.ownerWithdraw();

        uint256 finalBalance = fundingToken.balanceOf(address(this));
        assertTrue(finalBalance > initialBalance);
    }

    function test_OwnerWithdrawNotFinalized() public {
        vm.expectRevert(ProratedPool.PoolNotFinalized.selector);
        pool.ownerWithdraw();
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
        pool.calculateAllocations();

        // Protocol fees are only collected during swaps, not during liquidity addition
        uint256 factoryFees = factory.protocolFees(address(fundingToken));
        assertEq(
            factoryFees,
            0,
            "Protocol fees should not be collected during liquidity addition"
        );

        // Perform a swap to trigger protocol fee collection
        address pair = pool.lpToken();
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
        pool.calculateAllocations();

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

        // Try to release dev team tokens (should fail - only governor can call)
        vm.expectRevert("Only governor can call");
        pool.releaseDevTeamTokens();

        // Simulate governor call (for testing)
        vm.prank(address(pool.proratedGovernor()));
        pool.releaseDevTeamTokens();

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
        assertEq(pool.contributors(0), user1);
        assertEq(pool.contributors(1), user2);
        assertEq(pool.contributors(2), user3);
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
}
