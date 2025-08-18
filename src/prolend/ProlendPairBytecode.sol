// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ProlendPair} from "./ProlendPair.sol";

/// @title ProlendPairBytecode
/// @notice Holds ProlendPair creation bytecode to reduce ProlendFactory size
/// @dev This contract stores the bytecode separately so ProlendFactory doesn't embed it
contract ProlendPairBytecode {
    /// @notice The creation bytecode for ProlendPair (without constructor args)
    /// @dev This automatically stays in sync with ProlendPair changes
    bytes public constant PAIR_CREATION_CODE = type(ProlendPair).creationCode;
}
