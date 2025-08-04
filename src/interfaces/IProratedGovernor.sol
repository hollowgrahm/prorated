// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProratedGovernor {
    /// @notice Executes a proposal after it has been approved
    /// @param proposalId The ID of the proposal to execute
    function execute(uint256 proposalId) external;

    /// @notice Creates a new governance proposal
    /// @param target The target contract to call
    /// @param data The encoded function call data
    /// @param description Description of the proposal
    /// @return The ID of the created proposal
    function createProposal(
        address target,
        bytes memory data,
        string memory description
    ) external returns (uint256);

    /// @notice Gets the state of a proposal
    /// @param proposalId The ID of the proposal
    /// @return The current state of the proposal
    function state(uint256 proposalId) external view returns (uint8);

    /// @notice Checks if a proposal has reached quorum
    /// @param proposalId The ID of the proposal
    /// @return True if quorum is reached, false otherwise
    function quorumReached(uint256 proposalId) external view returns (bool);

    /// @notice Gets the total number of proposals
    /// @return The total proposal count
    function proposalCount() external view returns (uint256);

    /// @notice Adds a target contract as approved for governance proposals
    /// @param target The target contract address to approve
    function addApprovedTarget(address target) external;

    /// @notice Validates that this is a legitimate ProratedGovernor contract
    /// @return True if this is a valid ProratedGovernor contract
    function validateInterface() external pure returns (bool);
} 