// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @title IProlendDeployer Interface
/// @notice Interface for the ProlendDeployer contract
/// @dev Follows the same pattern as other deployer interfaces
interface IProlendDeployer {
    /// @notice Deploys Prolend lending pairs for a ProratedPool
    /// @param pool The ProratedPool address that will receive the deployed pair addresses
    function deployProlend(address pool) external;
}
