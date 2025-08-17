// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProratedPool {
    // ===== Read accessors =====
    function tokenName() external view returns (string memory);
    function tokenSymbol() external view returns (string memory);
    function tokenTotalSupply() external view returns (uint256);

    function developmentFund() external view returns (uint256);
    function liquidityFund() external view returns (uint256);
    function fundingToken() external view returns (address);

    function developerPercent() external view returns (uint256);
    function treasuryPercent() external view returns (uint256);
    function daoPercent() external view returns (uint256);

    function proswapFactory() external view returns (address);
    function proswapRouter() external view returns (address);

    function proratedToken() external view returns (address);
    function proswapPair() external view returns (address);
    function proratedVeNFT() external view returns (address);
    function proratedGovernor() external view returns (address);
    function proratedTreasury() external view returns (address);
    function prolendPair80() external view returns (address);
    function prolendPair20() external view returns (address);

    function developer() external view returns (address);

    function hasReachedMinimum() external view returns (bool);
    function totalLPTokensReceived() external view returns (uint256);
    function startTime() external view returns (uint256);
    function endTime() external view returns (uint256);

    // ===== Write hooks (only specific deployers) =====
    function setToken(address token) external;
    function setPair(address pair) external;
    function setVeNFT(address venft) external;
    function setGovernor(address governor) external;
    function setTreasury(address treasury) external;
    function setProlendPairs(address prolendPair80, address prolendPair20) external;

    function setLPAllocations(
        uint256 totalLp,
        uint256 developerLp,
        uint256 treasuryLp,
        uint256 daoLp
    ) external;

    function moveLiquidityToPair(
        uint256 tokenAmount,
        uint256 fundingAmount
    ) external;
}
