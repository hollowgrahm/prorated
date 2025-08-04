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
    // All state variables moved here
    string public tokenName;
    string public tokenSymbol;
    uint256 public tokenTotalSupply;
    uint256 public desiredContributions;
    uint256 public minTotalContributions;
    uint256 public startTime;
    uint256 public endTime;

    ERC20 public fundingToken;
    IProswapFactory public proswapFactory;
    IProswapRouter public proswapRouter;
    IProratedToken public proratedToken;
    address public proswapPair;

    IProratedVENFT public proratedVENFT;
    IProratedGovernor public proratedGovernor;
    IProratedTreasury public proratedTreasury;

    address public devTeam; // Explicit dev team reference for clarity
    uint256 public totalContributions;
    uint256 public totalShares;
    uint256 public totalLPTokensReceived;
    uint256 public devTeamAllocationPercentage;
    uint256 public devTeamLPTokenAllocation;
    uint256 public treasuryAllocationPercentage;
    uint256 public treasuryLPTokenAllocation;

    // Deployment tracking
    bool public tokenDeployed;
    bool public pairDeployed;
    bool public liquidityDeployed;

    bool public venftDeployed;
    bool public governorDeployed;
    bool public treasuryDeployed;

    uint256 public constant MIN_LOCK = 1;
    uint256 public constant MAX_LOCK = 208;

    address[] public contributors;
    mapping(address => Contribution) public contributions;

    struct Contribution {
        uint256 amount;
        uint256 lockDuration;
        uint256 shares;
        bool claimed;
    }
}
