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

    /// @notice Gets the total voting power across all veNFT positions at a specific timestamp
    /// @param _timestamp The timestamp to query total voting power at
    /// @return The total voting power at the specified timestamp
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256);

    /// @notice Gets the owner of a specific token ID
    /// @param _tokenId The token ID to check
    /// @return The owner address of the token
    function ownerOf(uint256 _tokenId) external view returns (address);

    /// @notice Withdraws the decayed amount from a veNFT position
    /// @param _tokenId The token ID to withdraw from
    function withdrawDecayed(uint256 _tokenId) external;

    /// @notice Transfers a veNFT from one address to another
    /// @param from The address to transfer from
    /// @param to The address to transfer to
    /// @param tokenId The token ID to transfer
    function transferFrom(address from, address to, uint256 tokenId) external;
}
