// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

/// @notice ERC20 token created by ProratedPool when funding is successful
/// @dev Extends solmate's ERC20 with minting capability for pool finalization
contract ProratedToken is ERC20 {
    /// @notice Creates a new token with specified name and symbol
    /// @param _name Token name
    /// @param _symbol Token symbol
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol, 18) {}

    /// @notice Mints tokens to the specified address
    /// @param to Address to receive the minted tokens
    /// @param amount Amount of tokens to mint
    /// @dev Only callable by the pool contract during finalization
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
