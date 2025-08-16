// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "../interfaces/IProswapFactory.sol";
import "../interfaces/IProswapPair.sol";
import {ProswapPair} from "./ProswapPair.sol";

/// @title ProswapCore
/// @notice Core utility functions for Proswap DEX
/// @dev Lightweight library with basic pair operations and address calculations
library ProswapCore {
    error InsufficientAmount();
    error InsufficientLiquidity();

    /// @notice Gets the reserves for a pair of tokens
    /// @param factoryAddress Address of the factory contract
    /// @param token80 Address of token with 80% weight
    /// @param token20 Address of token with 20% weight
    /// @return reserve80 Reserve of token with 80% weight
    /// @return reserve20 Reserve of token with 20% weight
    /// @dev Returns reserves in the order of the input tokens (no sorting)
    function getReserves(
        address factoryAddress,
        address token80,
        address token20
    ) external view returns (uint256, uint256) {
        // Step 1: Resolve pair address using input order (token80, token20)
        (uint112 reserve80, uint112 reserve20, ) = IProswapPair(
            pairFor(factoryAddress, token80, token20)
        ).getReserves();
        // Step 2: Return reserves in input order (cast to uint256)
        return (uint256(reserve80), uint256(reserve20));
    }

    /// @notice Calculates the deterministic pair address for two tokens in input order
    /// @param factoryAddress Address of the factory contract
    /// @param token80 Address of token with 80% weight
    /// @param token20 Address of token with 20% weight
    /// @return pairAddress Deterministic address of the pair
    /// @dev Uses CREATE2 to calculate the pair address without deployment
    /// @dev The order matters: pairFor(WETH, USDC) ≠ pairFor(USDC, WETH)
    function pairFor(
        address factoryAddress,
        address token80,
        address token20
    ) public pure returns (address pairAddress) {
        // Step 1: Create bytecode with constructor parameter
        bytes memory bytecode = abi.encodePacked(
            type(ProswapPair).creationCode,
            abi.encode(factoryAddress)
        );

        // Step 2: Compute CREATE2 address using input order (token80, token20)
        pairAddress = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            hex"ff",
                            factoryAddress,
                            keccak256(abi.encodePacked(token80, token20)),
                            keccak256(bytecode)
                        )
                    )
                )
            )
        );
    }
}
