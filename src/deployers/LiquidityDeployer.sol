// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {IProswapPair} from "../interfaces/IProswapPair.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";

contract LiquidityDeployer {
    using SafeTransferLib for ERC20;
    function deployLiquidity(address pool) external {
        IProratedPool p = IProratedPool(pool);

        uint256 tokenBalance = ERC20(p.proratedToken()).balanceOf(pool);
        uint256 fundingBalance = ERC20(p.fundingToken()).balanceOf(pool);
        uint256 devReserve = p.developmentFund();
        fundingBalance = fundingBalance - devReserve;

        address pair = p.proswapPair();
        p.moveLiquidityToPair(tokenBalance, fundingBalance);
        IProswapPair(pair).mint(pool);

        uint256 totalLp = ERC20(pair).balanceOf(pool);
        uint256 devLp = (totalLp * p.developerPercent()) / 100;
        uint256 treasuryLp = (totalLp * p.treasuryPercent()) / 100;
        uint256 daoLp = (totalLp * p.daoPercent()) / 100;
        p.setLPAllocations(totalLp, devLp, treasuryLp, daoLp);
    }
}
