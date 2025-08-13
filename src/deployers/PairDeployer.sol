// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {IProswapFactory} from "../interfaces/IProswapFactory.sol";

contract PairDeployer {
    function deployPair(address pool) external {
        IProratedPool p = IProratedPool(pool);
        address pair = IProswapFactory(p.proswapFactory()).createPair(
            p.proratedToken(),
            p.fundingToken()
        );
        p.setPair(pair);
    }
}
