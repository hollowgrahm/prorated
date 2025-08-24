// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {DemoProratedPool} from "./DemoProratedPool.sol";
import {SSTORE2} from "solady/utils/SSTORE2.sol";

contract DemoProratedFactory is Owned {
    // ============ EVENTS & ERRORS ============
    error PoolAlreadyDeployed(address pool);
    error InvalidPercentages();
    error ZeroAddress();
    error EmptyString();
    error InvalidTimeRange();
    error StartTimeTooFar();
    error EndTimeTooLong();
    error InvalidAmount();

    event PoolDeployed(
        address indexed pool,
        address indexed owner,
        bytes32 salt,
        uint256 allPoolsLength
    );

    // ============ STORAGE ============
    mapping(address => bool) public poolExists;
    address[] public allPools;
    /// @notice SSTORE2 pointers for DemoProratedPool bytecode (split to avoid 24KB limit)
    address public immutable poolBytecodePointer1; // First chunk
    address public immutable poolBytecodePointer2; // Second chunk
    address public immutable proswapFactory;
    address public immutable proswapRouter;
    address public immutable tokenDeployer;
    address public immutable pairDeployer;
    address public immutable liquidityDeployer;
    address public immutable veNFTDeployer;
    address public immutable governorDeployer;
    address public immutable treasuryDeployer;
    address public immutable prolendDeployer;

    // ============ CONSTRUCTOR ============
    constructor(
        address _owner,
        address _proswapFactory,
        address _proswapRouter,
        address _tokenDeployer,
        address _pairDeployer,
        address _liquidityDeployer,
        address _veNFTDeployer,
        address _governorDeployer,
        address _treasuryDeployer,
        address _prolendDeployer
    ) Owned(_owner) {
        // Get the full bytecode
        bytes memory fullBytecode = type(DemoProratedPool).creationCode;

        // Calculate split point (roughly half, but ensure we stay under 24KB per chunk)
        uint256 splitPoint = fullBytecode.length / 2;

        // Create first chunk
        bytes memory chunk1 = new bytes(splitPoint);
        for (uint256 i = 0; i < splitPoint; i++) {
            chunk1[i] = fullBytecode[i];
        }

        // Create second chunk
        uint256 chunk2Length = fullBytecode.length - splitPoint;
        bytes memory chunk2 = new bytes(chunk2Length);
        for (uint256 i = 0; i < chunk2Length; i++) {
            chunk2[i] = fullBytecode[splitPoint + i];
        }

        // Store both chunks using SSTORE2
        poolBytecodePointer1 = SSTORE2.write(chunk1);
        poolBytecodePointer2 = SSTORE2.write(chunk2);

        proswapFactory = _proswapFactory;
        proswapRouter = _proswapRouter;
        tokenDeployer = _tokenDeployer;
        pairDeployer = _pairDeployer;
        liquidityDeployer = _liquidityDeployer;
        veNFTDeployer = _veNFTDeployer;
        governorDeployer = _governorDeployer;
        treasuryDeployer = _treasuryDeployer;
        prolendDeployer = _prolendDeployer;
    }

    // ============ DEPLOYMENT API ============
    function createPool(
        DemoProratedPool.PoolConfig memory config,
        bytes32 salt
    ) external returns (address pool) {
        _validatePoolConfig(config);

        // Read both bytecode chunks from SSTORE2
        bytes memory chunk1 = SSTORE2.read(poolBytecodePointer1);
        bytes memory chunk2 = SSTORE2.read(poolBytecodePointer2);

        // Combine chunks to reconstruct full bytecode
        bytes memory poolCreationCode = abi.encodePacked(chunk1, chunk2);

        bytes memory constructorArgs = abi.encode(
            config,
            proswapFactory,
            proswapRouter,
            tokenDeployer,
            pairDeployer,
            liquidityDeployer,
            veNFTDeployer,
            governorDeployer,
            treasuryDeployer,
            prolendDeployer
        );

        bytes memory deploymentCode = abi.encodePacked(
            poolCreationCode,
            constructorArgs
        );

        bytes32 finalSalt = keccak256(abi.encodePacked(msg.sender, salt));

        assembly {
            pool := create2(
                0,
                add(deploymentCode, 0x20),
                mload(deploymentCode),
                finalSalt
            )
        }

        if (pool == address(0)) revert PoolAlreadyDeployed(pool);

        poolExists[pool] = true;
        allPools.push(pool);

        emit PoolDeployed(pool, config.owner, salt, allPools.length);
    }

    function predictPoolAddress(
        DemoProratedPool.PoolConfig memory config,
        bytes32 salt
    ) external view returns (address) {
        // Read both bytecode chunks from SSTORE2
        bytes memory chunk1 = SSTORE2.read(poolBytecodePointer1);
        bytes memory chunk2 = SSTORE2.read(poolBytecodePointer2);

        // Combine chunks to reconstruct full bytecode
        bytes memory poolCreationCode = abi.encodePacked(chunk1, chunk2);

        bytes memory constructorArgs = abi.encode(
            config,
            proswapFactory,
            proswapRouter,
            tokenDeployer,
            pairDeployer,
            liquidityDeployer,
            veNFTDeployer,
            governorDeployer,
            treasuryDeployer,
            prolendDeployer
        );

        bytes memory deploymentCode = abi.encodePacked(
            poolCreationCode,
            constructorArgs
        );

        bytes32 finalSalt = keccak256(abi.encodePacked(msg.sender, salt));
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                finalSalt,
                keccak256(deploymentCode)
            )
        );

        return address(uint160(uint256(hash)));
    }

    // ============ VIEW FUNCTIONS ============
    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }

    function getPoolCount() external view returns (uint256) {
        return allPools.length;
    }

    // ============ VALIDATION ============
    function _validatePoolConfig(
        DemoProratedPool.PoolConfig memory config
    ) internal view {
        if (config.owner == address(0)) revert ZeroAddress();
        if (config.fundingToken == address(0)) revert ZeroAddress();
        if (bytes(config.tokenName).length == 0) revert EmptyString();
        if (bytes(config.tokenSymbol).length == 0) revert EmptyString();
        if (config.tokenTotalSupply == 0) revert InvalidAmount();
        if (config.developmentFund == 0) revert InvalidAmount();
        if (config.liquidityFund == 0) revert InvalidAmount();
        if (config.startTime >= config.endTime) revert InvalidTimeRange();
        if (config.startTime > block.timestamp + 365 days)
            revert StartTimeTooFar();
        if (config.endTime > config.startTime + 365 days)
            revert EndTimeTooLong();

        uint256 totalPercent = config.developerPercent +
            config.treasuryPercent +
            config.daoPercent;
        if (totalPercent != 100) revert InvalidPercentages();
    }
}
