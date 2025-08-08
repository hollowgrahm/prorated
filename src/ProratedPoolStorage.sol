// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {IProratedToken} from "./interfaces/IProratedToken.sol";
import {IProswapFactory} from "./interfaces/IProswapFactory.sol";
import {IProswapRouter} from "./interfaces/IProswapRouter.sol";
import {IProratedVENFT} from "./interfaces/IProratedVENFT.sol";
import {IProratedGovernor} from "./interfaces/IProratedGovernor.sol";
import {IProratedTreasury} from "./interfaces/IProratedTreasury.sol";

contract ProratedPoolStorage {
    string public tokenName;
    string public tokenSymbol;
    uint256 public tokenTotalSupply;
    uint256 public developmentFund;
    uint256 public liquidityFund;
    uint256 public minTotalContributions;
    uint256 public startTime;
    uint256 public endTime;
    ERC20 public fundingToken;

    IProswapFactory public proswapFactory;
    IProswapRouter public proswapRouter;
    address public proswapPair;

    IProratedToken public proratedToken;
    IProratedVENFT public proratedVENFT;
    IProratedGovernor public proratedGovernor;
    IProratedTreasury public proratedTreasury;

    address public developer;
    uint256 public totalContributions;
    uint256 public totalShares;
    uint256 public totalLPTokensReceived;
    uint256 public developerPercent;
    uint256 public treasuryPercent;
    uint256 public daoPercent;
    uint256 public developerLPTokens;
    uint256 public treasuryLPTokens;
    uint256 public daoLPTokens;

    uint256 public constant MIN_LOCK = 1;
    uint256 public constant MAX_LOCK = 208;
    uint256 public constant WEEK = 7 days;

    mapping(address => Contribution) public contributions;

    struct Contribution {
        uint256 amount;
        uint256 lockDuration;
        uint256 shares;
        bool claimed;
    }
}
