// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {IProratedToken} from "../interfaces/IProratedToken.sol";
import {ProratedToken} from "../ProratedToken.sol";

contract TokenDeployer {
    function deployToken(address pool) external {
        IProratedPool p = IProratedPool(pool);
        IProratedToken token = IProratedToken(
            address(new ProratedToken(p.tokenName(), p.tokenSymbol()))
        );
        token.mint(pool, p.tokenTotalSupply());
        p.setToken(address(token));
    }
}
