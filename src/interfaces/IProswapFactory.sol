// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProswapFactory {
    function pairs(
        address token80,
        address token20
    ) external view returns (address pair);
    function allPairs(uint256 index) external view returns (address pair);
    function allPairsLength() external view returns (uint256);

    function createPair(
        address token80,
        address token20
    ) external returns (address pair);

    // Protocol-wide fees removed in prototype
}
