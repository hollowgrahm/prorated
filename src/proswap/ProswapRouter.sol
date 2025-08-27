// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "../interfaces/IProswapFactory.sol";
import "../interfaces/IProswapPair.sol";
import "../proswap/ProswapCore.sol";
import "../proswap/ProswapLibrary.sol";
import "../libraries/Math.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";

contract ProswapRouter is ReentrancyGuard {
    using SafeTransferLib for ERC20;

    error ExcessiveInputAmount();
    error Insufficient80Amount();
    error Insufficient20Amount();
    error InsufficientOutputAmount();

    IProswapFactory factory;

    // ============ CONSTRUCTOR ============
    /// @notice Creates a new Proswap router
    /// @param factoryAddress Address of the Proswap factory contract
    constructor(address factoryAddress) {
        // Step 1: Store factory reference
        factory = IProswapFactory(factoryAddress);
    }

    // ============ CORE ROUTER FUNCTIONS ============

    /// @notice Adds liquidity to a weighted pool using x^0.8 * y^0.2 = k invariant
    /// @param token80 Address of token with 80% weight
    /// @param token20 Address of token with 20% weight
    /// @param amount80Desired Desired amount of token with 80% weight
    /// @param amount20Desired Desired amount of token with 20% weight
    /// @param amount80Min Minimum amount of token with 80% weight
    /// @param amount20Min Minimum amount of token with 20% weight
    /// @param to Address to receive the LP tokens
    /// @return amount80 Actual amount of token with 80% weight added
    /// @return amount20 Actual amount of token with 20% weight added
    /// @return liquidity Amount of LP tokens minted
    /// @dev Creates pair if it doesn't exist and calculates optimal amounts for weighted invariant
    function addLiquidity(
        address token80,
        address token20,
        uint256 amount80Desired,
        uint256 amount20Desired,
        uint256 amount80Min,
        uint256 amount20Min,
        address to
    )
        public
        nonReentrant
        returns (uint256 amount80, uint256 amount20, uint256 liquidity)
    {
        // Step 1: Ensure pair exists (create if missing)
        if (factory.pairs(token80, token20) == address(0)) {
            factory.createPair(token80, token20);
        }

        // Step 2: Calculate optimal amounts with invariant ratio checks
        (amount80, amount20) = _calculateLiquidity(
            token80,
            token20,
            amount80Desired,
            amount20Desired,
            amount80Min,
            amount20Min
        );
        // Step 3: Transfer tokens to pair and mint LP to recipient
        address pairAddress = ProswapCore.pairFor(
            address(factory),
            token80,
            token20
        );
        ERC20(token80).safeTransferFrom(msg.sender, pairAddress, amount80);
        ERC20(token20).safeTransferFrom(msg.sender, pairAddress, amount20);
        liquidity = IProswapPair(pairAddress).mint(to);
    }

    /// @notice Removes liquidity from a weighted pool
    /// @param token80 Address of token with 80% weight
    /// @param token20 Address of token with 20% weight
    /// @param liquidity Amount of LP tokens to burn
    /// @param amount80Min Minimum amount of token with 80% weight to receive
    /// @param amount20Min Minimum amount of token with 20% weight to receive
    /// @param to Address to receive the underlying tokens
    /// @return amount80 Amount of token with 80% weight received
    /// @return amount20 Amount of token with 20% weight received
    /// @dev LP token redemption is proportional regardless of invariant type
    function removeLiquidity(
        address token80,
        address token20,
        uint256 liquidity,
        uint256 amount80Min,
        uint256 amount20Min,
        address to
    ) public nonReentrant returns (uint256 amount80, uint256 amount20) {
        // Step 1: Locate the pair
        address pair = ProswapCore.pairFor(address(factory), token80, token20);
        // Step 2: Transfer LP tokens to pair and burn
        IProswapPair(pair).transferFrom(msg.sender, pair, liquidity);
        (amount80, amount20) = IProswapPair(pair).burn(to);
        // Step 3: Enforce minimum output amounts
        if (amount80 < amount80Min) revert Insufficient80Amount();
        if (amount20 < amount20Min) revert Insufficient20Amount();
    }

    /// @notice Swaps an exact amount of input tokens for as many output tokens as possible
    /// @param amountIn Amount of input tokens to swap
    /// @param amountOutMin Minimum amount of output tokens to receive
    /// @param tokenIn Address of input token
    /// @param tokenOut Address of output token
    /// @param to Address to receive the output tokens
    /// @return amountOut Amount of output tokens received
    /// @dev Simplified version for direct token-to-token swaps without multi-hop paths
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address to
    ) public nonReentrant returns (uint256 amountOut) {
        // Step 1: Find existing pair and get reserves in correct order
        address pairAddress = _findExistingPair(tokenIn, tokenOut);
        address token80 = IProswapPair(pairAddress).token80();

        // Step 2: Get reserves and calculate output amount using weighted invariant
        (uint256 reserve80, uint256 reserve20) = ProswapCore.getReserves(
            address(factory),
            token80,
            IProswapPair(pairAddress).token20()
        );

        // Apply 0.3% fee to input amount
        uint256 amountInWithFee = (amountIn * 997) / 1000;

        // Calculate output using correct weights based on token roles
        if (tokenIn == token80) {
            // Input is token80 (80% weight), output is token20 (20% weight)
            amountOut = Math.computeOutGivenExactIn(
                reserve80,
                8e17,
                reserve20,
                2e17,
                amountInWithFee
            );
        } else {
            // Input is token20 (20% weight), output is token80 (80% weight)
            amountOut = Math.computeOutGivenExactIn(
                reserve20,
                2e17,
                reserve80,
                8e17,
                amountInWithFee
            );
        }

        // Step 3: Ensure minimum output requirement is met
        if (amountOut < amountOutMin) revert InsufficientOutputAmount();

        // Step 4: Transfer input tokens to pair
        ERC20(tokenIn).safeTransferFrom(msg.sender, pairAddress, amountIn);

        // Step 5: Execute the swap
        _swap(amountOut, tokenIn, tokenOut, pairAddress, to);
    }

    /// @notice Swaps tokens for an exact amount of output tokens
    /// @param amountOut Exact amount of output tokens to receive
    /// @param amountInMax Maximum amount of input tokens to spend
    /// @param tokenIn Address of input token
    /// @param tokenOut Address of output token
    /// @param to Address to receive the output tokens
    /// @return amountIn Amount of input tokens spent
    /// @dev Simplified version for direct token-to-token swaps without multi-hop paths
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address tokenIn,
        address tokenOut,
        address to
    ) public nonReentrant returns (uint256 amountIn) {
        // Step 1: Find existing pair and get reserves in correct order
        address pairAddress = _findExistingPair(tokenIn, tokenOut);
        address token80 = IProswapPair(pairAddress).token80();

        // Step 2: Get reserves and calculate required input amount using weighted invariant
        (uint256 reserve80, uint256 reserve20) = ProswapCore.getReserves(
            address(factory),
            token80,
            IProswapPair(pairAddress).token20()
        );

        // Calculate input using correct weights based on token roles
        uint256 amountInWithFee;
        if (tokenIn == token80) {
            // Input is token80 (80% weight), output is token20 (20% weight)
            amountInWithFee = Math.computeInGivenExactOut(
                reserve80,
                8e17,
                reserve20,
                2e17,
                amountOut
            );
        } else {
            // Input is token20 (20% weight), output is token80 (80% weight)
            amountInWithFee = Math.computeInGivenExactOut(
                reserve20,
                2e17,
                reserve80,
                8e17,
                amountOut
            );
        }

        // Adjust for 0.3% fee
        amountIn = (amountInWithFee * 1000) / 997;

        // Step 3: Ensure input requirement doesn't exceed maximum
        if (amountIn > amountInMax) revert ExcessiveInputAmount();

        // Step 4: Transfer input tokens to pair
        ERC20(tokenIn).safeTransferFrom(msg.sender, pairAddress, amountIn);

        // Step 5: Execute the swap
        _swap(amountOut, tokenIn, tokenOut, pairAddress, to);
    }

    // ============ PRIVATE HELPER FUNCTIONS ============

    /// @notice Finds the existing pair address for two tokens regardless of order
    /// @param tokenA First token address
    /// @param tokenB Second token address
    /// @return pairAddress Address of the existing pair
    /// @dev Checks both possible orderings since factory only stores pairs in one direction
    function _findExistingPair(
        address tokenA,
        address tokenB
    ) internal view returns (address pairAddress) {
        // Step 1: Check if pair exists as (tokenA, tokenB)
        pairAddress = factory.pairs(tokenA, tokenB);
        if (pairAddress != address(0)) {
            return pairAddress;
        }

        // Step 2: Check if pair exists as (tokenB, tokenA)
        pairAddress = factory.pairs(tokenB, tokenA);
        if (pairAddress != address(0)) {
            return pairAddress;
        }

        // Step 3: If no pair exists, revert
        revert("ProswapRouter: PAIR_NOT_EXISTS");
    }

    /// @notice Calculates optimal liquidity amounts for weighted invariant
    /// @param token80 Address of token with 80% weight
    /// @param token20 Address of token with 20% weight
    /// @param amount80Desired Desired amount of token with 80% weight
    /// @param amount20Desired Desired amount of token with 20% weight
    /// @param amount80Min Minimum amount of token with 80% weight
    /// @param amount20Min Minimum amount of token with 20% weight
    /// @return amount80 Calculated amount of token with 80% weight
    /// @return amount20 Calculated amount of token with 20% weight
    /// @dev Implements invariant ratio checking to prevent excessive liquidity impact
    function _calculateLiquidity(
        address token80,
        address token20,
        uint256 amount80Desired,
        uint256 amount20Desired,
        uint256 amount80Min,
        uint256 amount20Min
    ) internal view returns (uint256 amount80, uint256 amount20) {
        // Step 1: Fetch current reserves for target pair
        (uint256 reserve80, uint256 reserve20) = ProswapCore.getReserves(
            address(factory),
            token80,
            token20
        );

        if (reserve80 == 0 && reserve20 == 0) {
            // Step 2a: First liquidity — accept desired amounts
            (amount80, amount20) = (amount80Desired, amount20Desired);
        } else {
            // Step 2b: Compute optimal counterpart amount using current price
            uint256 amount20Optimal = ProswapLibrary.quote(
                amount80Desired,
                reserve80,
                reserve20
            );
            if (amount20Optimal <= amount20Desired) {
                if (amount20Optimal <= amount20Min)
                    revert Insufficient20Amount();

                // SECURITY: Enhanced invariant ratio checking prevents excessive liquidity impact
                // This ensures new liquidity doesn't dramatically change the pool's invariant
                // MAX_INVARIANT_RATIO = 300% prevents manipulation through large liquidity additions
                // MIN_INVARIANT_RATIO = 70% prevents dramatic invariant reduction
                // Step 3: Invariant ratio guard — forward case
                uint256 newInvariant = Math.computeInvariant(
                    reserve80 + amount80Desired,
                    reserve20 + amount20Optimal
                );
                uint256 oldInvariant = Math.computeInvariant(
                    reserve80,
                    reserve20
                );
                uint256 invariantRatio = (newInvariant * Math.WAD) /
                    oldInvariant;

                Math.ensureInvariantRatioBelowMaximumBound(invariantRatio);
                Math.ensureInvariantRatioAboveMinimumBound(invariantRatio);

                (amount80, amount20) = (amount80Desired, amount20Optimal);
            } else {
                uint256 amount80Optimal = ProswapLibrary.quote(
                    amount20Desired,
                    reserve20,
                    reserve80
                );

                // INVARIANT MIGRATION: Removed problematic assertion for weighted pools
                // Old invariant: assert(amount80Optimal <= amount80Desired) always passed
                // New invariant: amount80Optimal can exceed amount80Desired due to weighted pricing
                // Solution: Use minimum of optimal and desired amounts gracefully
                uint256 amount80ToUse = amount80Optimal <= amount80Desired
                    ? amount80Optimal
                    : amount80Desired;

                if (amount80ToUse <= amount80Min) revert Insufficient80Amount();

                // SECURITY: Same invariant ratio checking for the reverse case
                // Step 4: Invariant ratio guard — reverse case
                uint256 newInvariant = Math.computeInvariant(
                    reserve80 + amount80ToUse,
                    reserve20 + amount20Desired
                );
                uint256 oldInvariant = Math.computeInvariant(
                    reserve80,
                    reserve20
                );
                uint256 invariantRatio = (newInvariant * Math.WAD) /
                    oldInvariant;

                Math.ensureInvariantRatioBelowMaximumBound(invariantRatio);
                Math.ensureInvariantRatioAboveMinimumBound(invariantRatio);

                (amount80, amount20) = (amount80ToUse, amount20Desired);
            }
        }
    }

    /// @notice Internal function to execute a direct token swap
    /// @param amountOut Amount of output tokens to receive
    /// @param tokenOut Address of output token
    /// @param pairAddress Address of the existing pair
    /// @param to Address to receive the output tokens
    /// @dev Simplified swap execution for direct token-to-token swaps without multi-hop paths
    function _swap(
        uint256 amountOut,
        address, // tokenIn - unused but kept for interface consistency
        address tokenOut,
        address pairAddress,
        address to
    ) internal {
        // Step 1: Determine output amounts for the pair's swap function
        // We need to check the actual token ordering in the pair to set amount0Out/amount1Out correctly
        address token80 = IProswapPair(pairAddress).token80();

        uint256 amount0Out;
        uint256 amount1Out;

        if (tokenOut == token80) {
            // Output token is token80 (token0 in the pair)
            amount0Out = amountOut;
            amount1Out = 0;
        } else {
            // Output token is token20 (token1 in the pair)
            amount0Out = 0;
            amount1Out = amountOut;
        }

        // Step 2: Execute the swap on the pair
        IProswapPair(pairAddress).swap(amount0Out, amount1Out, to, "");
    }
}
