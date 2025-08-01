// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProswapCallee {
    function proswapCall(
        address sender,
        uint256 amount80Out,
        uint256 amount20Out,
        bytes calldata data
    ) external;
}
