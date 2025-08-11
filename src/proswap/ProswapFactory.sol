// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "../proswap/ProswapPair.sol";
import "../interfaces/IProswapPair.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";

contract ProswapFactory is ReentrancyGuard, Owned {
    error IdenticalAddresses();
    error PairExists();
    error ZeroAddress();

    event PairCreated(
        address indexed token80,
        address indexed token20,
        address pair,
        uint256 allPairsLength
    );

    mapping(address => mapping(address => address)) public pairs;
    address[] public allPairs;

    // ============ CONSTRUCTOR ============
    /// @notice Creates a new Proswap factory
    /// @param _owner Address of the factory owner
    constructor(address _owner) Owned(_owner) {}

    // ============ CORE FACTORY FUNCTIONS ============

    /// @notice Creates a new weighted pair where token80 gets 80% weight and token20 gets 20% weight
    /// @param token80 The favored token (80% weight)
    /// @param token20 The disfavored token (20% weight)
    /// @return pair Address of the created pair
    /// @dev Uses CREATE2 for deterministic pair addresses
    /// @dev The order matters: createPair(WETH, USDC) ≠ createPair(USDC, WETH)
    function createPair(
        address token80,
        address token20
    ) public nonReentrant returns (address pair) {
        if (token80 == token20) revert IdenticalAddresses();
        if (token80 == address(0) || token20 == address(0))
            revert ZeroAddress();

        if (pairs[token80][token20] != address(0)) revert PairExists();

        // Create pair with factory address parameter
        bytes memory bytecode = abi.encodePacked(
            type(ProswapPair).creationCode,
            abi.encode(address(this))
        );
        bytes32 salt = keccak256(abi.encodePacked(token80, token20));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        IProswapPair(pair).initialize(token80, token20);

        pairs[token80][token20] = pair;
        allPairs.push(pair);

        emit PairCreated(token80, token20, pair, allPairs.length);
    }

    // Protocol-wide fee management removed in prototype
}
