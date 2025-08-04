// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProratedTreasury {
    function createTreasuryVeNFTPosition(uint256 amount, uint256 lockDuration) external;
    function withdrawTreasuryDecayed() external;
    function distributeFunds(address recipient, uint256 amount, string memory reason) external;
    function getTreasuryVotingPower() external view returns (uint256);
    function getTreasuryBalance() external view returns (uint256);
    function treasuryVeNFTTokenId() external view returns (uint256);
    function treasuryVeNFTCreated() external view returns (bool);
} 