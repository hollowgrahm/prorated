// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

contract MockUSDC is ERC20 {
    mapping(address => bool) public demoContracts;

    constructor() ERC20("Mock USDC", "USDC", 6) {}

    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 6); // 1000 USDC
    }

    function addDemoContract(address contractAddress) external {
        demoContracts[contractAddress] = true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        // Auto-approve for demo contracts to skip approval step
        if (demoContracts[msg.sender]) {
            if (balanceOf[from] < amount) return false;

            balanceOf[from] -= amount;
            balanceOf[to] += amount;

            emit Transfer(from, to, amount);
            return true;
        }

        // Normal ERC20 transferFrom for non-demo contracts
        return super.transferFrom(from, to, amount);
    }
}
