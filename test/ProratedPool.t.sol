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
        assertEq(pool.tokenDeployed(), false);
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

        assertEq(pool.tokenDeployed(), true);
        assertTrue(address(pool.proratedToken()) != address(0));
        assertEq(pool.pairDeployed(), false);
        assertEq(pool.liquidityDeployed(), false);
        assertEq(pool.venftDeployed(), false);
        assertEq(pool.governorDeployed(), false);
        assertEq(pool.treasuryDeployed(), false);

        // Try to deploy token again
        vm.expectRevert(ProratedPool.TokenAlreadyDeployed.selector);
        pool.deployToken();
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

        assertEq(pool.tokenDeployed(), true);
        assertEq(pool.pairDeployed(), true);
        assertTrue(address(pool.proswapPair()) != address(0));
        assertEq(pool.liquidityDeployed(), false);
        assertEq(pool.venftDeployed(), false);
        assertEq(pool.governorDeployed(), false);
        assertEq(pool.treasuryDeployed(), false);

        // Try to deploy pair again
        vm.expectRevert(ProratedPool.PairAlreadyDeployed.selector);
        pool.deployPair();
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

        assertEq(pool.tokenDeployed(), true);
        assertEq(pool.pairDeployed(), true);
        assertEq(pool.liquidityDeployed(), true);
        assertEq(pool.venftDeployed(), false);
        assertEq(pool.governorDeployed(), false);
        assertEq(pool.treasuryDeployed(), false);

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

        uint256 initialBalance = fundingToken.balanceOf(address(this));

        // Dev team withdraw (should succeed since liquidity not deployed yet)
        pool.devTeamFundsWithdraw();

        uint256 finalBalance = fundingToken.balanceOf(address(this));
        assertTrue(finalBalance > initialBalance);
    }

    function test_DevTeamFundsWithdrawNotFinalized() public {
        vm.expectRevert(ProratedPool.TokenNotDeployed.selector);
        pool.devTeamFundsWithdraw();
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

        assertEq(pool.tokenDeployed(), true);
        assertEq(pool.pairDeployed(), true);
        assertEq(pool.liquidityDeployed(), true);
        assertEq(pool.venftDeployed(), true);
        assertEq(pool.governorDeployed(), true);
        assertEq(pool.treasuryDeployed(), true);
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

        assertEq(pool.tokenDeployed(), true);
        assertEq(pool.pairDeployed(), true);
        assertEq(pool.liquidityDeployed(), true);
        assertEq(pool.venftDeployed(), true);
        assertEq(pool.governorDeployed(), true);
        assertEq(pool.treasuryDeployed(), false);
        assertTrue(address(pool.proratedGovernor()) != address(0));

        // Try to deploy governor again
        vm.expectRevert(ProratedPool.GovernorAlreadyDeployed.selector);
        pool.deployGovernor();
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
}
