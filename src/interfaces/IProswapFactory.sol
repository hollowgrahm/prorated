// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

interface IProswapFactory {
    function pairs(
        address token80,
        address token20
    ) external view returns (address pair);
    function allPairs(uint256 index) external view returns (address pair);
    function allPairsLength() external view returns (uint256);

    function createPair(
        address token80,
        address token20
    ) external returns (address pair);

    // Protocol fee management
    function protocolFeeNumerator() external view returns (uint256);
    function protocolFeeDenominator() external view returns (uint256);
    function protocolFees(address token) external view returns (uint256);

    function setProtocolFee(
        uint256 newNumerator,
        uint256 newDenominator
    ) external;
    function getProtocolFeePercentage() external view returns (uint256);
    function calculateProtocolFee(
        uint256 amountIn
    ) external view returns (uint256);
    function collectProtocolFee(address token, uint256 amount) external;
    function withdrawProtocolFees(address token) external;
    function withdrawProtocolFeesMultiple(address[] calldata tokens) external;
}
