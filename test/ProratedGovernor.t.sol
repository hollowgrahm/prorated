// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Test} from "lib/forge-std/src/Test.sol";
import {ProratedGovernor} from "../src/ProratedGovernor.sol";
import {ProratedPool} from "../src/ProratedPool.sol";
import {ProratedVENFT} from "../src/ProratedVENFT.sol";
import {ProratedToken} from "../src/ProratedToken.sol";
import {ProswapFactory} from "../src/ProswapFactory.sol";
import {ProswapRouter} from "../src/ProswapRouter.sol";
import {ERC20Mintable} from "./mocks/ERC20Mintable.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

contract ProratedGovernorTest is Test {
    ProratedGovernor public governor;
    ProratedGovernor public testGovernor;
    ProratedPool public pool;
    ProratedVENFT public venft;
    ProratedToken public proratedToken;
    ProswapFactory public factory;
    ProswapRouter public router;
    ERC20Mintable public fundingToken;

    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    address public owner = address(0x4);

    uint256 public user1TokenId;
    uint256 public user2TokenId;
    uint256 public user3TokenId;

    function setUp() public {
        // Deploy tokens
        fundingToken = new ERC20Mintable("Funding", "FUND");

        // Deploy Proswap contracts
        factory = new ProswapFactory(owner);
        router = new ProswapRouter(address(factory));

        // Deploy ProratedToken
        proratedToken = new ProratedToken("Prorated", "PROR");

        // Deploy ProratedVENFT (we'll use a mock LP token for now)
        venft = new ProratedVENFT(address(fundingToken)); // Using fundingToken as LP token for testing

        // Deploy ProratedPool
        pool = new ProratedPool(
            address(this), // owner
            "Test Token",
            "TEST",
            1000000e18,
            500000e18,
            block.timestamp,
            block.timestamp + 7 days,
            address(fundingToken),
            address(factory),
            address(router),
            20 // 20% dev team allocation
        );

        // Governor will be deployed by ProratedPool during finalization
        // For testing, we'll deploy it separately with owner as governor owner
        governor = new ProratedGovernor(address(venft), address(this));
        governor.addApprovedTarget(address(pool));

        // Store the test governor for reference
        testGovernor = governor;

        // Setup users with veNFT positions
        _setupUserVeNFTPositions();
    }

    function _setupUserVeNFTPositions() internal {
        // Mint tokens to users
        fundingToken.mint(1000000e18, user1);
        fundingToken.mint(1000000e18, user2);
        fundingToken.mint(1000000e18, user3);

        // Users approve and create veNFT positions
        vm.startPrank(user1);
        fundingToken.approve(address(venft), type(uint256).max);
        user1TokenId = venft.createLock(20e18, 4 weeks);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(venft), type(uint256).max);
        user2TokenId = venft.createLock(12e18, 4 weeks);
        vm.stopPrank();

        vm.startPrank(user3);
        fundingToken.approve(address(venft), type(uint256).max);
        user3TokenId = venft.createLock(8e18, 4 weeks);
        vm.stopPrank();
    }

    function _finalizePool() internal {
        // Add contributions to reach minimum (minTotalContributions = desiredContributions * 2 = 1000000e18)
        vm.startPrank(user1);
        fundingToken.approve(address(pool), 500000e18);
        vm.warp(block.timestamp + 1);
        pool.contribute(500000e18, 52);
        vm.stopPrank();

        vm.startPrank(user2);
        fundingToken.approve(address(pool), 500000e18);
        vm.warp(block.timestamp + 1);
        pool.contribute(500000e18, 52);
        vm.stopPrank();

        // Finalize the pool
        vm.warp(block.timestamp + 7 days + 1);
        pool.finalizePool();

        // Update governor to use the one deployed by the pool
        governor = ProratedGovernor(address(pool.governor()));

        // Create veNFT positions in the pool's venft for voting
        _createPoolVeNFTPositions();
    }

    function _createPoolVeNFTPositions() internal {
        // Get LP tokens from the pool for users
        address lpToken = pool.lpToken();

        // Transfer some LP tokens to users for veNFT positions
        vm.startPrank(address(pool));
        ERC20(lpToken).transfer(user1, 1000e18);
        ERC20(lpToken).transfer(user2, 600e18);
        ERC20(lpToken).transfer(user3, 400e18);
        vm.stopPrank();

        // Users create veNFT positions in the pool's venft
        vm.startPrank(user1);
        ERC20(lpToken).approve(
            address(pool.venftContract()),
            type(uint256).max
        );
        user1TokenId = pool.venftContract().createLock(1000e18, 4 weeks);
        vm.stopPrank();

        vm.startPrank(user2);
        ERC20(lpToken).approve(
            address(pool.venftContract()),
            type(uint256).max
        );
        user2TokenId = pool.venftContract().createLock(600e18, 4 weeks);
        vm.stopPrank();

        vm.startPrank(user3);
        ERC20(lpToken).approve(
            address(pool.venftContract()),
            type(uint256).max
        );
        user3TokenId = pool.venftContract().createLock(400e18, 4 weeks);
        vm.stopPrank();
    }

    // ============ CONSTRUCTOR TESTS ============

    function test_Constructor() public {
        assertEq(address(governor.venft()), address(venft));
        assertEq(governor.owner(), address(this));
        assertEq(governor.proposalCount(), 0);
    }

    // ============ PROPOSAL CREATION TESTS ============

    function test_CreateProposal() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";

        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        assertEq(proposalId, 0);
        assertEq(governor.proposalCount(), 1);

        // Access individual fields of the proposal struct
        (
            address proposer,
            address target,
            bytes memory data,
            string memory desc,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool canceled
        ) = governor.proposals(proposalId);
        assertEq(proposer, address(this));
        assertEq(target, address(pool));
        assertEq(desc, description);
        assertEq(forVotes, 0);
        assertEq(againstVotes, 0);
        assertEq(executed, false);
        assertEq(canceled, false);
    }

    function test_CreateProposalInvalidTarget() public {
        bytes memory proposalData = abi.encodeWithSignature("someFunction()");
        string memory description = "Test proposal";

        vm.expectRevert("Target not approved");
        governor.createProposal(address(0x123), proposalData, description);
    }

    function test_CreateProposalMultiple() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";

        uint256 proposalId1 = governor.createProposal(
            address(pool),
            proposalData,
            description
        );
        uint256 proposalId2 = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        assertEq(proposalId1, 0);
        assertEq(proposalId2, 1);
        assertEq(governor.proposalCount(), 2);
    }

    // ============ VOTING TESTS ============

    function test_VoteFor() public {
        // Create proposal
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote for
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        (
            ,
            ,
            ,
            string memory desc,
            uint256 forVotes,
            uint256 againstVotes,
            ,
            ,
            ,

        ) = governor.proposals(proposalId);
        assertGt(forVotes, 0);
        assertEq(againstVotes, 0);
    }

    function test_VoteAgainst() public {
        // Create proposal
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote against
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, false);

        (
            ,
            ,
            ,
            string memory desc,
            uint256 forVotes,
            uint256 againstVotes,
            ,
            ,
            ,

        ) = governor.proposals(proposalId);
        assertEq(forVotes, 0);
        assertGt(againstVotes, 0);
    }

    function test_VoteMultipleUsers() public {
        // Create proposal
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // User1 votes for
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        // User2 votes against
        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, false);

        // User3 votes for
        vm.prank(user3);
        governor.vote(proposalId, user3TokenId, true);

        (
            ,
            ,
            ,
            string memory desc,
            uint256 forVotes,
            uint256 againstVotes,
            ,
            ,
            ,

        ) = governor.proposals(proposalId);
        assertGt(forVotes, againstVotes);
    }

    function test_VoteBeforeVotingStarts() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Try to vote before voting starts
        vm.prank(user1);
        vm.expectRevert(ProratedGovernor.VotingNotStarted.selector);
        governor.vote(proposalId, user1TokenId, true);
    }

    function test_VoteAfterVotingEnds() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);

        // Try to vote after voting ends
        vm.prank(user1);
        vm.expectRevert(ProratedGovernor.VotingEnded.selector);
        governor.vote(proposalId, user1TokenId, true);
    }

    function test_VoteDoubleVote() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote once
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        // Try to vote again with same token
        vm.prank(user1);
        vm.expectRevert(ProratedGovernor.AlreadyVoted.selector);
        governor.vote(proposalId, user1TokenId, false);
    }

    function test_VoteInsufficientVotingPower() public {
        // Create a user with no veNFT position
        address user4 = address(0x5);
        fundingToken.mint(100e18, user4);

        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Try to vote with non-existent token ID
        vm.prank(user4);
        vm.expectRevert(ProratedGovernor.InsufficientVotingPower.selector);
        governor.vote(proposalId, 999, true);
    }

    // ============ PROPOSAL STATE TESTS ============

    function test_ProposalStatePending() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Pending)
        );
    }

    function test_ProposalStateActive() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Active)
        );
    }

    function test_ProposalStateSucceeded() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote for with enough voting power to reach quorum
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, true);

        vm.prank(user3);
        governor.vote(proposalId, user3TokenId, true);

        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);

        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Succeeded)
        );
    }

    function test_ProposalStateDefeated() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote against
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, false);

        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, false);

        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);

        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Defeated)
        );
    }

    // ============ QUORUM TESTS ============

    function test_QuorumReached() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote with enough power to reach quorum
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, true);

        vm.prank(user3);
        governor.vote(proposalId, user3TokenId, true);

        bool quorumReached = governor.quorumReached(proposalId);
        assertTrue(quorumReached);
    }

    function test_QuorumNotReached() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Create a user with very small voting power
        address user4 = address(0x5);
        fundingToken.mint(1e18, user4);

        vm.startPrank(user4);
        fundingToken.approve(address(venft), type(uint256).max);
        uint256 user4TokenId = venft.createLock(1e18, 1 weeks); // Very small voting power
        vm.stopPrank();

        // Vote with insufficient power
        vm.prank(user4);
        governor.vote(proposalId, user4TokenId, true);

        bool quorumReached = governor.quorumReached(proposalId);
        assertFalse(quorumReached);
    }

    // ============ PROPOSAL CANCELLATION TESTS ============

    function test_CancelProposal() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Cancel proposal
        governor.cancel(proposalId);

        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Canceled)
        );
    }

    function test_CancelProposalNotProposer() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Try to cancel as different user
        vm.prank(user1);
        vm.expectRevert(ProratedGovernor.ProposalNotCancellable.selector);
        governor.cancel(proposalId);
    }

    function test_CancelProposalAfterVotingStarts() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Try to cancel after voting starts
        vm.expectRevert(ProratedGovernor.VotingDelayNotMet.selector);
        governor.cancel(proposalId);
    }

    // ============ EXECUTION TESTS ============

    function test_ExecuteProposal() public {
        // First finalize the pool to allocate dev team tokens
        _finalizePool();

        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote for with enough power to reach quorum
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, true);

        vm.prank(user3);
        governor.vote(proposalId, user3TokenId, true);

        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);

        // Execute proposal
        governor.execute(proposalId);

        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Executed)
        );
    }

    function test_ExecuteProposalNotSucceeded() public {
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward past voting period without voting
        vm.warp(block.timestamp + 8 days);

        // Try to execute failed proposal
        vm.expectRevert(ProratedGovernor.ProposalNotSucceeded.selector);
        governor.execute(proposalId);
    }

    function test_ExecuteProposalAlreadyExecuted() public {
        // First finalize the pool to allocate dev team tokens
        _finalizePool();

        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // Fast forward to voting period
        vm.warp(block.timestamp + 3 days);

        // Vote for with enough power to reach quorum
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, true);

        vm.prank(user3);
        governor.vote(proposalId, user3TokenId, true);

        // Fast forward past voting period
        vm.warp(block.timestamp + 8 days);

        // Execute proposal
        governor.execute(proposalId);

        // Try to execute again
        vm.expectRevert(ProratedGovernor.ProposalAlreadyExecuted.selector);
        governor.execute(proposalId);
    }

    // ============ ADMIN FUNCTIONS TESTS ============

    function test_AddApprovedTarget() public {
        address newTarget = address(0x123);
        governor.addApprovedTarget(newTarget);
        assertTrue(governor.approvedTargets(newTarget));
    }

    function test_RemoveApprovedTarget() public {
        address target = address(pool);
        governor.removeApprovedTarget(target);
        assertFalse(governor.approvedTargets(target));
    }

    function test_AddApprovedTargetNotOwner() public {
        address newTarget = address(0x123);
        vm.prank(user1);
        vm.expectRevert();
        governor.addApprovedTarget(newTarget);
    }

    // ============ INTEGRATION TESTS ============

    function test_CompleteGovernanceWorkflow() public {
        // First finalize the pool to allocate dev team tokens
        _finalizePool();

        // 1. Create proposal to release dev team tokens
        bytes memory proposalData = abi.encodeWithSignature(
            "releaseDevTeamTokens()"
        );
        string memory description = "Release dev team's locked LP tokens";
        uint256 proposalId = governor.createProposal(
            address(pool),
            proposalData,
            description
        );

        // 2. Wait for voting to start
        vm.warp(block.timestamp + 3 days);

        // 3. Vote with enough power to reach quorum
        vm.prank(user1);
        governor.vote(proposalId, user1TokenId, true);

        vm.prank(user2);
        governor.vote(proposalId, user2TokenId, true);

        vm.prank(user3);
        governor.vote(proposalId, user3TokenId, true);

        // 4. Wait for voting to end
        vm.warp(block.timestamp + 8 days);

        // 5. Execute the proposal
        governor.execute(proposalId);

        // 6. Verify proposal is executed
        ProratedGovernor.ProposalState state = governor.state(proposalId);
        assertEq(
            uint256(state),
            uint256(ProratedGovernor.ProposalState.Executed)
        );
    }

    function test_GovernanceConstants() public {
        assertEq(governor.VOTING_DELAY(), 2 days);
        assertEq(governor.VOTING_PERIOD(), 5 days);
        assertEq(governor.QUORUM_NUMERATOR(), 25);
        assertEq(governor.QUORUM_DENOMINATOR(), 100);
    }
}
