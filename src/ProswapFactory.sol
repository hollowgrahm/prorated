// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "./ProswapPair.sol";
import "./interfaces/IProswapPair.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";

contract ProswapFactory is ReentrancyGuard, Owned {
    using SafeTransferLib for ERC20;

    error IdenticalAddresses();
    error PairExists();
    error ZeroAddress();
    error InvalidFeeRatio();
    error MaxFeeExceeded();

    event PairCreated(
        address indexed token80,
        address indexed token20,
        address pair,
        uint256
    );
    event ProtocolFeeCollected(address indexed token, uint256 amount);
    event ProtocolFeeWithdrawn(address indexed token, uint256 amount);
    event ProtocolFeeUpdated(uint256 newNumerator, uint256 newDenominator);

    mapping(address => mapping(address => address)) public pairs;
    address[] public allPairs;

    // Global protocol fee settings
    uint256 public protocolFeeNumerator = 25; // 25% of swap fee
    uint256 public protocolFeeDenominator = 100; // 100%
    uint256 public constant SWAP_FEE_NUMERATOR = 3; // 0.3% = 3/1000
    uint256 public constant SWAP_FEE_DENOMINATOR = 1000;
    uint256 public constant MAX_PROTOCOL_FEE_PERCENTAGE = 50; // 50% max

    // Track accumulated fees per token globally
    mapping(address => uint256) public protocolFees;

    constructor(address _owner) Owned(_owner) {}

    /// @notice Creates a new weighted pair where token80 gets 80% weight and token20 gets 20% weight
    /// @param token80 The favored token (80% weight)
    /// @param token20 The disfavored token (20% weight)
    /// @return pair Address of the created pair
    /// @dev Uses CREATE2 for deterministic pair addresses
    /// @dev The order matters: createPair(WETH, USDC) ≠ createPair(USDC, WETH)
    function createPair(
        address token80,
        address token20
    ) public nonReentrant returns (address pair) {
        if (token80 == token20) revert IdenticalAddresses();
        if (token80 == address(0) || token20 == address(0))
            revert ZeroAddress();

        if (pairs[token80][token20] != address(0)) revert PairExists();

        // Create pair with factory address parameter
        bytes memory bytecode = abi.encodePacked(
            type(ProswapPair).creationCode,
            abi.encode(address(this))
        );
        bytes32 salt = keccak256(abi.encodePacked(token80, token20));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        IProswapPair(pair).initialize(token80, token20);

        pairs[token80][token20] = pair;
        allPairs.push(pair);

        emit PairCreated(token80, token20, pair, allPairs.length);
    }

    /// @notice Update global protocol fee percentage
    /// @param newNumerator New protocol fee numerator
    /// @param newDenominator New protocol fee denominator
    /// @dev Can only be called by owner
    function setProtocolFee(
        uint256 newNumerator,
        uint256 newDenominator
    ) external onlyOwner {
        if (newDenominator == 0) revert InvalidFeeRatio();
        if (newNumerator > newDenominator) revert InvalidFeeRatio();
        if (newNumerator > MAX_PROTOCOL_FEE_PERCENTAGE) revert MaxFeeExceeded();

        protocolFeeNumerator = newNumerator;
        protocolFeeDenominator = newDenominator;

        emit ProtocolFeeUpdated(newNumerator, newDenominator);
    }

    /// @notice Get current protocol fee percentage
    /// @return feePercentage Protocol fee as basis points (e.g., 2500 = 25%)
    function getProtocolFeePercentage() external view returns (uint256) {
        return (protocolFeeNumerator * 10000) / protocolFeeDenominator;
    }

    /// @notice Calculate protocol fee amount for given input
    /// @param amountIn Input amount
    /// @return protocolFeeAmount Calculated protocol fee
    function calculateProtocolFee(
        uint256 amountIn
    ) external view returns (uint256) {
        return
            (amountIn * protocolFeeNumerator * SWAP_FEE_NUMERATOR) /
            (protocolFeeDenominator * SWAP_FEE_DENOMINATOR);
    }

    /// @notice Called by pairs to collect protocol fees
    /// @param token The token being collected as fees
    /// @param amount The amount of fees collected
    function collectProtocolFee(address token, uint256 amount) external {
        // No validation needed - any token can be sent to factory
        protocolFees[token] += amount;
        emit ProtocolFeeCollected(token, amount);
    }

    /// @notice Withdraw accumulated protocol fees for a specific token
    /// @param token The token to withdraw fees for
    function withdrawProtocolFees(address token) external onlyOwner {
        uint256 amount = protocolFees[token];
        if (amount > 0) {
            protocolFees[token] = 0;
            ERC20(token).safeTransfer(owner, amount);
            emit ProtocolFeeWithdrawn(token, amount);
        }
    }

    /// @notice Withdraw all accumulated protocol fees for multiple tokens
    /// @param tokens Array of token addresses to withdraw fees for
    function withdrawProtocolFeesMultiple(
        address[] calldata tokens
    ) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = protocolFees[token];
            if (amount > 0) {
                protocolFees[token] = 0;
                ERC20(token).safeTransfer(owner, amount);
                emit ProtocolFeeWithdrawn(token, amount);
            }
        }
    }
}
