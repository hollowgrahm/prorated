// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ProratedPool} from "./ProratedPool.sol";

/// @title PoolBytecodeHolder
/// @notice Holds ProratedPool creation bytecode to reduce ProratedFactory size
/// @dev This contract stores the bytecode separately so ProratedFactory doesn't embed it
contract ProratedPoolBytecode {
    /// @notice The creation bytecode for ProratedPool (without constructor args)
    /// @dev This automatically stays in sync with ProratedPool changes
    bytes public constant POOL_CREATION_CODE = type(ProratedPool).creationCode;

    /// @notice Get the hash of the pool creation code
    /// @return The keccak256 hash of POOL_CREATION_CODE
    function getPoolCreationCodeHash() external pure returns (bytes32) {
        return keccak256(POOL_CREATION_CODE);
    }
}
