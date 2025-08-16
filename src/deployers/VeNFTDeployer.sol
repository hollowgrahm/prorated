// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {ProratedVeNFT} from "../ProratedVeNFT.sol";
import {IProratedVeNFT} from "../interfaces/IProratedVeNFT.sol";
// no ERC20 import; names are passed by pool

contract VeNFTDeployer {
    function deployVeNFT(
        address pool,
        string memory veName,
        string memory veSymbol
    ) external {
        IProratedPool p = IProratedPool(pool);
        IProratedVeNFT venft = IProratedVeNFT(
            address(new ProratedVeNFT(p.proswapPair(), veName, veSymbol))
        );
        p.setVeNFT(address(venft));
    }
}
