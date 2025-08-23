// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC", 6) {}

    function faucet() external {
        _mint(msg.sender, 1000 * 10**6); // 1000 USDC
    }
}
