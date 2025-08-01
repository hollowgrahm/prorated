// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @notice Standard ERC20 interface
interface IERC20 {
    /// @notice Transfers tokens to another address
    /// @param to Address to transfer to
    /// @param amount Amount to transfer
    /// @return success Whether the transfer was successful
    function transfer(address to, uint256 amount) external returns (bool);

    /// @notice Transfers tokens from one address to another
    /// @param from Address to transfer from
    /// @param to Address to transfer to
    /// @param amount Amount to transfer
    /// @return success Whether the transfer was successful
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    /// @notice Approves spender to spend tokens
    /// @param spender Address to approve
    /// @param amount Amount to approve
    /// @return success Whether the approval was successful
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice Gets the balance of an address
    /// @param account Address to check balance for
    /// @return balance Token balance
    function balanceOf(address account) external view returns (uint256);

    /// @notice Gets the allowance for a spender
    /// @param owner Address that owns the tokens
    /// @param spender Address that can spend the tokens
    /// @return allowance Amount of tokens spender can spend
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

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

    /// @notice Transfer event
    event Transfer(address indexed from, address indexed to, uint256 amount);

    /// @notice Approval event
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
}
