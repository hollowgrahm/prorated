// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @notice Interface for ProratedToken contract
interface IProratedToken {
    /// @notice Mints tokens to the specified address
    /// @param to Address to receive the minted tokens
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external;

    /// @notice Approves spender to spend tokens
    /// @param spender Address to approve
    /// @param amount Amount to approve
    /// @return success Whether the approval was successful
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice Transfers tokens to another address
    /// @param to Address to transfer to
    /// @param amount Amount to transfer
    /// @return success Whether the transfer was successful
    function transfer(address to, uint256 amount) external returns (bool);

    /// @notice Gets the token name
    /// @return name Token name
    function name() external view returns (string memory);

    /// @notice Gets the token symbol
    /// @return symbol Token symbol
    function symbol() external view returns (string memory);

    /// @notice Gets the token decimals
    /// @return decimals Token decimals
    function decimals() external view returns (uint8);

    /// @notice Gets the total supply
    /// @return totalSupply Total token supply
    function totalSupply() external view returns (uint256);

    /// @notice Gets the balance of an address
    /// @param account Address to check balance for
    /// @return balance Token balance
    function balanceOf(address account) external view returns (uint256);
}
