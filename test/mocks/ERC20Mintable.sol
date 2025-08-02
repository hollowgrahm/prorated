// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "lib/solmate/src/tokens/ERC20.sol";

contract ERC20Mintable is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_, 18) {}

    function mint(uint256 amount, address to) public {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public {
        _burn(from, amount);
    }
}
