// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {ProratedGovernor} from "../ProratedGovernor.sol";
import {IProratedGovernor} from "../interfaces/IProratedGovernor.sol";

contract GovernorDeployer {
    function deployGovernor(address pool) external {
        IProratedPool p = IProratedPool(pool);
        IProratedGovernor gov = IProratedGovernor(
            address(new ProratedGovernor(p.proratedVeNFT(), pool))
        );
        // Pool will add itself as approved target in setGovernor (owner = pool)
        p.setGovernor(address(gov));
    }
}
