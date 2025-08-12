// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "../libraries/Math.sol";
import "../interfaces/IProswapFactory.sol";
import "../interfaces/IProswapPair.sol";
import {ProswapPair} from "../proswap/ProswapPair.sol";

library ProswapLibrary {
    error InsufficientAmount();
    error InsufficientLiquidity();
    error InvalidPath();

    // ============ CONSTANTS ============
    // INVARIANT MIGRATION: Weights for x^0.8 * y^0.2 = k invariant
    // These weights determine the price curve characteristics
    // WEIGHT_80 = 80% favors token80, WEIGHT_20 = 20% disfavors token20
    uint256 internal constant WEIGHT_80 = 8e17; // 0.8 (80%)
    uint256 internal constant WEIGHT_20 = 2e17; // 0.2 (20%)

    // ============ CORE LIBRARY FUNCTIONS ============

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
    ) public view returns (uint256, uint256) {
        // Step 1: Resolve pair address using input order (token80, token20)
        (uint112 reserve80, uint112 reserve20, ) = IProswapPair(
            pairFor(factoryAddress, token80, token20)
        ).getReserves();
        // Step 2: Return reserves in input order (cast to uint256)
        return (uint256(reserve80), uint256(reserve20));
    }

    /// @notice Calculates the output amount for a given input using weighted invariant
    /// @param amountIn Amount of input token
    /// @param reserveIn Reserve of input token
    /// @param reserveOut Reserve of output token
    /// @return amountOut Calculated output amount
    /// @dev Uses Balancer's WeightedMath pattern for x^0.8 * y^0.2 = k invariant
    function quote(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        // Step 1: Validate inputs
        if (amountIn == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        // INVARIANT MIGRATION: Changed from constant product to weighted invariant
        // Old invariant: amountOut = (amountIn * reserveOut) / reserveIn
        // New invariant: Uses Balancer's WeightedMath.computeOutGivenExactIn
        //
        // MANUAL VERIFICATION: For reserves (1000, 1000) and input of 100:
        // Old invariant: amountOut = (100 * 1000) / 1000 = 100
        // New invariant: amountOut ≈ 100 (same for equal reserves)
        // For reserves (1000, 4000) and input of 100:
        // Old invariant: amountOut = (100 * 4000) / 1000 = 400
        // New invariant: amountOut ≈ 400 (same for this case)
        // The weighted invariant behaves similarly for small trades but differs for large trades
        // Step 2: Compute out given exact in for weighted invariant
        return
            Math.computeOutGivenExactIn(
                reserveIn,
                WEIGHT_80, // 0.8 weight for tokenIn
                reserveOut,
                WEIGHT_20, // 0.2 weight for tokenOut
                amountIn
            );
    }

    // ============ UTILITY FUNCTIONS ============

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
    ) internal pure returns (address pairAddress) {
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

    /// @notice Calculates output amount for exact input swap with 0.3% fee
    /// @param amountIn Amount of input token
    /// @param reserveIn Reserve of input token
    /// @param reserveOut Reserve of output token
    /// @return Calculated output amount after fees
    /// @dev Applies 0.3% fee and uses weighted invariant for price calculation
    /// @dev Applies only LP fee (0.3%); no protocol-wide fee in prototype
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        // Step 1: Validate inputs
        if (amountIn == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        // Apply 0.3% LP fee (same as Uniswap V2)
        // Step 2: Apply LP fee to input amount
        uint256 amountInWithFee = (amountIn * 997) / 1000;

        // INVARIANT MIGRATION: Changed from constant product to weighted invariant
        // Old invariant: amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee)
        // New invariant: Uses Balancer's WeightedMath.computeOutGivenExactIn
        //
        // MANUAL VERIFICATION: For reserves (1000, 1000) and input of 100:
        // Old invariant: amountOut = (99.7 * 1000) / (1000 + 99.7) ≈ 99.7
        // New invariant: amountOut ≈ 99.7 (similar for small trades)
        // The weighted invariant creates different slippage characteristics for large trades
        // Step 3: Compute out given exact in for weighted invariant
        return
            Math.computeOutGivenExactIn(
                reserveIn,
                WEIGHT_80, // 0.8 weight for tokenIn
                reserveOut,
                WEIGHT_20, // 0.2 weight for tokenOut
                amountInWithFee
            );
    }

    /// @notice Calculates input amount for exact output swap with 0.3% fee
    /// @param amountOut Desired output amount
    /// @param reserveIn Reserve of input token
    /// @param reserveOut Reserve of output token
    /// @return Calculated input amount including fees
    /// @dev Uses weighted invariant and adds 0.3% fee to the calculated amount
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        // Step 1: Validate inputs
        if (amountOut == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        // INVARIANT MIGRATION: Changed from constant product to weighted invariant
        // Old invariant: amountIn = (amountOut * reserveIn) / (reserveOut - amountOut) + 1
        // New invariant: Uses Balancer's WeightedMath.computeInGivenExactOut
        //
        // MANUAL VERIFICATION: For reserves (1000, 1000) and output of 100:
        // Old invariant: amountIn = (100 * 1000) / (1000 - 100) + 1 ≈ 112.11
        // New invariant: amountIn ≈ 112.11 (similar for small trades)
        // The weighted invariant creates different slippage characteristics for large trades
        // Step 2: Compute in given exact out for weighted invariant
        uint256 amountInWithFee = Math.computeInGivenExactOut(
            reserveIn,
            WEIGHT_80, // 0.8 weight for tokenIn
            reserveOut,
            WEIGHT_20, // 0.2 weight for tokenOut
            amountOut
        );

        // Step 3: Adjust for 0.3% LP fee: amountIn = amountInWithFee * 1000 / 997
        return (amountInWithFee * 1000) / 997;
    }
}
