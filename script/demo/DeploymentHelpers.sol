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

    // ============ ADDRESS PARSING HELPERS ============

    /// @notice Parse an address string (e.g., "0x1234...") to address type
    /// @param addressStr The address string to parse
    /// @return The parsed address
    function parseAddress(
        string memory addressStr
    ) internal pure returns (address) {
        bytes memory addressBytes = bytes(addressStr);
        require(addressBytes.length == 42, "Invalid address length");
        require(
            addressBytes[0] == "0" && addressBytes[1] == "x",
            "Address must start with 0x"
        );

        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            result *= 16;
            uint8 digit = uint8(addressBytes[i]);

            if (digit >= 48 && digit <= 57) {
                // 0-9
                result += digit - 48;
            } else if (digit >= 65 && digit <= 70) {
                // A-F
                result += digit - 55;
            } else if (digit >= 97 && digit <= 102) {
                // a-f
                result += digit - 87;
            } else {
                revert("Invalid hex character");
            }
        }

        return address(result);
    }
}
