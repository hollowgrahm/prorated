// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ProratedVENFT} from "./ProratedVENFT.sol";

contract ProratedGovernor is Owned, ReentrancyGuard {
    // ============ ERRORS ============
    error ProposalNotFound();
    error ProposalNotActive();
    error ProposalAlreadyExecuted();
    error ProposalNotSucceeded();
    error VotingNotStarted();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyVoted();
    error InsufficientVotingPower();
    error QuorumNotReached();
    error InvalidTarget();
    error ExecutionFailed();
    error ProposalNotCancellable();
    error VotingDelayNotMet();

    // ============ EVENTS ============
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed target,
        bytes data,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed tokenId,
        uint256 indexed proposalId,
        bool support,
        uint256 votingPower
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        address indexed target,
        bytes data
    );
    event ProposalCanceled(uint256 indexed proposalId);

    // ============ CONSTANTS ============
    uint256 public constant VOTING_DELAY = 2 days;
    uint256 public constant VOTING_PERIOD = 5 days;
    uint256 public constant QUORUM_NUMERATOR = 25; // 25%
    uint256 public constant QUORUM_DENOMINATOR = 100;

    // ============ STATE VARIABLES ============
    ProratedVENFT public immutable venft;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => bool)) public hasVoted; // proposalId => tokenId => hasVoted
    mapping(address => bool) public approvedTargets;

    // ============ STRUCTS ============
    struct Proposal {
        address proposer;
        address target;
        bytes data;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
    }

    enum ProposalState {
        Pending,
        Active,
        Defeated,
        Succeeded,
        Executed,
        Canceled
    }

    // ============ CONSTRUCTOR ============
    constructor(address _venft, address _owner) Owned(_owner) {
        venft = ProratedVENFT(_venft);
    }

    // ============ MODIFIERS ============
    modifier onlyApprovedTarget(address target) {
        require(approvedTargets[target], "Target not approved");
        _;
    }

    // ============ CORE FUNCTIONS ============

    /// @notice Create a new governance proposal
    /// @param target The contract to call
    /// @param data The function call data
    /// @param description Human-readable description of the proposal
    /// @return proposalId The ID of the created proposal
    function createProposal(
        address target,
        bytes memory data,
        string memory description
    ) external onlyApprovedTarget(target) returns (uint256 proposalId) {
        proposalId = proposalCount++;

        uint256 startTime = block.timestamp + VOTING_DELAY;
        uint256 endTime = startTime + VOTING_PERIOD;

        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            target: target,
            data: data,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: startTime,
            endTime: endTime,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(
            proposalId,
            msg.sender,
            target,
            data,
            description,
            startTime,
            endTime
        );
    }

    /// @notice Vote on a proposal using veNFT voting power
    /// @param proposalId The ID of the proposal to vote on
    /// @param tokenId The veNFT token ID to vote with
    /// @param support True for For, false for Against
    function vote(uint256 proposalId, uint256 tokenId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalNotActive();
        if (block.timestamp < proposal.startTime) revert VotingNotStarted();
        if (block.timestamp > proposal.endTime) revert VotingEnded();
        if (hasVoted[proposalId][tokenId]) revert AlreadyVoted();

        // Get voting power from veNFT
        uint256 votingPower = venft.balanceOfNFT(tokenId);
        if (votingPower == 0) revert InsufficientVotingPower();

        // Record vote
        hasVoted[proposalId][tokenId] = true;

        if (support) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }

        emit VoteCast(msg.sender, tokenId, proposalId, support, votingPower);
    }

    /// @notice Execute a successful proposal
    /// @param proposalId The ID of the proposal to execute
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalNotActive();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (block.timestamp <= proposal.endTime) revert VotingNotEnded();
        if (state(proposalId) != ProposalState.Succeeded)
            revert ProposalNotSucceeded();

        proposal.executed = true;

        // Execute the proposal
        (bool success, ) = proposal.target.call(proposal.data);
        if (!success) revert ExecutionFailed();

        emit ProposalExecuted(proposalId, proposal.target, proposal.data);
    }

    /// @notice Cancel a proposal (only proposer can cancel before voting starts)
    /// @param proposalId The ID of the proposal to cancel
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (proposal.canceled) revert ProposalNotActive();
        if (msg.sender != proposal.proposer) revert ProposalNotCancellable();
        if (block.timestamp >= proposal.startTime) revert VotingDelayNotMet();

        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Get the current state of a proposal
    /// @param proposalId The ID of the proposal
    /// @return The current state of the proposal
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.proposer == address(0)) revert ProposalNotFound();
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;

        // Voting has ended, check if proposal succeeded
        if (
            proposal.forVotes > proposal.againstVotes &&
            quorumReached(proposalId)
        ) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }

    /// @notice Check if quorum has been reached for a proposal
    /// @param proposalId The ID of the proposal
    /// @return True if quorum is reached
    function quorumReached(uint256 proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = (venft.totalSupply() * QUORUM_NUMERATOR) /
            QUORUM_DENOMINATOR;
        return totalVotes >= quorum;
    }

    /// @notice Get the total voting power at a specific time
    /// @param timepoint The time to get voting power at
    /// @return The total voting power
    function getPastTotalSupply(
        uint256 timepoint
    ) public view returns (uint256) {
        return venft.totalSupply();
    }

    // ============ ADMIN FUNCTIONS ============

    /// @notice Add an approved target contract
    /// @param target The contract address to approve
    function addApprovedTarget(address target) external onlyOwner {
        approvedTargets[target] = true;
    }

    /// @notice Remove an approved target contract
    /// @param target The contract address to remove
    function removeApprovedTarget(address target) external onlyOwner {
        approvedTargets[target] = false;
    }
}
