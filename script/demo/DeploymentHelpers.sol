// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/// @title DeploymentHelpers
/// @notice Shared utilities for deployment scripts
/// @dev Provides common functions for verification and address parsing
abstract contract DeploymentHelpers is Script {
    // ============ VERIFICATION HELPERS ============

    /// @notice Verify a contract deployment succeeded
    /// @param contractAddress The deployed contract address
    /// @param contractName Human-readable name for error messages
    function verifyDeployment(
        address contractAddress,
        string memory contractName
    ) internal view {
        require(
            contractAddress != address(0),
            string(abi.encodePacked(contractName, ": zero address"))
        );
        require(
            contractAddress.code.length > 0,
            string(
                abi.encodePacked(contractName, ": deployment failed - no code")
            )
        );
    }

    /// @notice Verify a deployment and log success
    /// @param contractAddress The deployed contract address
    /// @param contractName Human-readable name
    function verifyDeploymentAndLog(
        address contractAddress,
        string memory contractName
    ) internal view {
        verifyDeployment(contractAddress, contractName);
        console.log(
            string(
                abi.encodePacked(contractName, " verified successfully at:")
            ),
            contractAddress
        );
    }
}
