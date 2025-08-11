// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProratedTreasury {
    function withdrawTreasuryDecayed() external;
    function transferTreasuryFunds(
        address recipient,
        uint256 amount,
        string memory reason
    ) external;
    function increaseTreasuryLockAmount(uint256 amount) external;
    function extendTreasuryLockDuration(uint256 newDuration) external;
    function compoundTreasuryRewards() external;
    function getTreasuryVotingPower() external view returns (uint256);
    function getTreasuryBalance() external view returns (uint256);
    function treasuryVeNFTTokenId() external view returns (uint256);
    function treasuryVeNFTCreated() external view returns (bool);
}
