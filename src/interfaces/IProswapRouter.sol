// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @notice Interface for ProswapRouter contract
interface IProswapRouter {
    /// @notice Adds liquidity to a weighted pool
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
    function addLiquidity(
        address token80,
        address token20,
        uint256 amount80Desired,
        uint256 amount20Desired,
        uint256 amount80Min,
        uint256 amount20Min,
        address to
    ) external returns (uint256 amount80, uint256 amount20, uint256 liquidity);

    /// @notice Removes liquidity from a weighted pool
    /// @param token80 Address of token with 80% weight
    /// @param token20 Address of token with 20% weight
    /// @param liquidity Amount of LP tokens to burn
    /// @param amount80Min Minimum amount of token with 80% weight to receive
    /// @param amount20Min Minimum amount of token with 20% weight to receive
    /// @param to Address to receive the underlying tokens
    /// @return amount80 Amount of token with 80% weight received
    /// @return amount20 Amount of token with 20% weight received
    function removeLiquidity(
        address token80,
        address token20,
        uint256 liquidity,
        uint256 amount80Min,
        uint256 amount20Min,
        address to
    ) external returns (uint256 amount80, uint256 amount20);
}
