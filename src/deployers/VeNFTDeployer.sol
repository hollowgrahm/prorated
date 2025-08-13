// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {ProratedVeNFT} from "../ProratedVeNFT.sol";
import {IProratedVeNFT} from "../interfaces/IProratedVeNFT.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

contract VeNFTDeployer {
    function deployVeNFT(address pool) external {
        IProratedPool p = IProratedPool(pool);
        string memory lpName = ERC20(p.proswapPair()).name();
        string memory lpSymbol = ERC20(p.proswapPair()).symbol();
        string memory veName = string(
            abi.encodePacked("Prorated veNFT - ", lpName)
        );
        string memory veSymbol = string(abi.encodePacked("ve", lpSymbol));
        IProratedVeNFT venft = IProratedVeNFT(
            address(new ProratedVeNFT(p.proswapPair(), veName, veSymbol))
        );
        p.setVeNFT(address(venft));
    }
}
