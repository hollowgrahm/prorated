// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ProratedPool} from "./ProratedPool.sol";
import {SSTORE2} from "solady/utils/SSTORE2.sol";

/// @title ProratedFactory
/// @notice Factory to deploy ProratedPool instances using CREATE2
contract ProratedFactory is Owned {
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
    address public immutable poolBytecodePointer;
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
    /// @notice Initializes the factory with an owner and fixed Proswap endpoints
    /// @param _owner The owner address
    /// @param _proswapFactory The Proswap factory address
    /// @param _proswapRouter The Proswap router address
    /// @param _tokenDeployer Token deployer
    /// @param _pairDeployer Pair deployer
    /// @param _liquidityDeployer Liquidity deployer
    /// @param _veNFTDeployer VeNFT deployer
    /// @param _governorDeployer Governor deployer
    /// @param _treasuryDeployer Treasury deployer
    /// @param _prolendDeployer Prolend deployer
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
        // Store ProratedPool bytecode using SSTORE2
        poolBytecodePointer = SSTORE2.write(type(ProratedPool).creationCode);

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
    /// @notice Deploy a new ProratedPool with deterministic salt
    /// @param config The `ProratedPool.PoolConfig` configuration struct
    /// @param salt The user-provided salt for CREATE2 (must be unique)
    /// @return pool The address of the deployed pool
    function createPool(
        ProratedPool.PoolConfig memory config,
        bytes32 salt
    ) external returns (address pool) {
        // Step 1: Validate configuration parameters (moved from pool constructor)
        _validatePoolConfig(config);

        // Step 2: Get bytecode from SSTORE2 (automatically stays in sync)
        bytes memory poolCreationCode = SSTORE2.read(poolBytecodePointer);

        // Step 3: Build constructor args
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

        // Step 4: Combine creation code + constructor args
        bytes memory initcode = abi.encodePacked(
            poolCreationCode,
            constructorArgs
        );
        bytes32 initcodeHash = keccak256(initcode);

        // Step 5: Compute expected address and revert if already deployed
        address predicted = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            initcodeHash
                        )
                    )
                )
            )
        );
        if (poolExists[predicted]) revert PoolAlreadyDeployed(predicted);
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(predicted)
        }
        if (codeSize > 0) revert PoolAlreadyDeployed(predicted);

        // Step 6: Deploy directly with CREATE2 (no external calls needed!)
        assembly {
            pool := create2(0, add(initcode, 32), mload(initcode), salt)
        }
        require(pool != address(0), "CREATE2_FAILED");

        // Step 7: Record and emit
        poolExists[pool] = true;
        allPools.push(pool);
        emit PoolDeployed(pool, config.owner, salt, allPools.length);
    }

    // ============ VIEWS ============
    /// @notice Returns number of deployed pools
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    // ============ INTERNAL FUNCTIONS ============
    /// @notice Validates pool configuration parameters
    /// @param config The pool configuration to validate
    /// @dev Moved from ProratedPool constructor to reduce pool bytecode size
    function _validatePoolConfig(
        ProratedPool.PoolConfig memory config
    ) internal view {
        if (bytes(config.tokenName).length == 0) revert EmptyString();
        if (bytes(config.tokenSymbol).length == 0) revert EmptyString();
        if (config.fundingToken == address(0)) revert ZeroAddress();
        if (config.tokenTotalSupply == 0) revert InvalidAmount();
        if (config.developmentFund == 0) revert InvalidAmount();
        if (config.liquidityFund == 0) revert InvalidAmount();
        if (
            (config.developerPercent +
                config.treasuryPercent +
                config.daoPercent) != 100
        ) revert InvalidPercentages();
        if (config.startTime >= config.endTime) revert InvalidTimeRange();
        if (config.startTime > block.timestamp + 30 days)
            revert StartTimeTooFar();
        if (config.endTime > config.startTime + 30 days)
            revert EndTimeTooLong();
    }
}
