// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProratedVENFT {
    /// @notice Creates a new veNFT lock position
    /// @param _value Amount of tokens to lock
    /// @param _lockDuration Duration of the lock in seconds
    /// @return The token ID of the newly created veNFT
    function createLock(
        uint256 _value,
        uint256 _lockDuration
    ) external returns (uint256);

    /// @notice Gets the voting power of a specific veNFT token
    /// @param _tokenId The token ID to check
    /// @return The voting power of the token
    function balanceOfNFT(uint256 _tokenId) external view returns (uint256);

    /// @notice Gets the total supply of voting power
    /// @return The total voting power across all tokens
    function totalSupply() external view returns (uint256);

    /// @notice Gets the owner of a specific token ID
    /// @param _tokenId The token ID to check
    /// @return The owner address of the token
    function ownerOf(uint256 _tokenId) external view returns (address);
} 