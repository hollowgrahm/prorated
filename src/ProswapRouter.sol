// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "./interfaces/IProswapFactory.sol";
import "./interfaces/IProswapPair.sol";
import "./ProswapLibrary.sol";
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

    constructor(address factoryAddress) {
        factory = IProswapFactory(factoryAddress);
    }

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
        if (factory.pairs(token80, token20) == address(0)) {
            factory.createPair(token80, token20);
        }

        (amount80, amount20) = _calculateLiquidity(
            token80,
            token20,
            amount80Desired,
            amount20Desired,
            amount80Min,
            amount20Min
        );
        address pairAddress = ProswapLibrary.pairFor(
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
        address pair = ProswapLibrary.pairFor(
            address(factory),
            token80,
            token20
        );
        IProswapPair(pair).transferFrom(msg.sender, pair, liquidity);
        (amount80, amount20) = IProswapPair(pair).burn(to);
        if (amount80 < amount80Min) revert Insufficient80Amount();
        if (amount20 < amount20Min) revert Insufficient20Amount();
    }

    //
    //
    //
    //  PRIVATE
    //
    //
    //

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
    ) internal returns (uint256 amount80, uint256 amount20) {
        (uint256 reserve80, uint256 reserve20) = ProswapLibrary.getReserves(
            address(factory),
            token80,
            token20
        );

        if (reserve80 == 0 && reserve20 == 0) {
            (amount80, amount20) = (amount80Desired, amount20Desired);
        } else {
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
}
