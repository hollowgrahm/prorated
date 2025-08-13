// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {ProratedTreasury} from "../ProratedTreasury.sol";
import {IProratedTreasury} from "../interfaces/IProratedTreasury.sol";

contract TreasuryDeployer {
    function deployTreasury(address pool) external {
        IProratedPool p = IProratedPool(pool);
        IProratedTreasury treasury = IProratedTreasury(
            address(
                new ProratedTreasury(
                    ProratedTreasury.TreasuryParams({
                        venft: p.proratedVeNFT(),
                        governor: p.proratedGovernor(),
                        pair: p.proswapPair(),
                        owner: p.developer()
                    })
                )
            )
        );
        p.setTreasury(address(treasury));
    }
}
