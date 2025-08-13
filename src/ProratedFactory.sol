// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {ProratedPool} from "./ProratedPool.sol";

/// @title ProratedFactory
/// @notice Factory to deploy ProratedPool instances using CREATE2
contract ProratedFactory is ReentrancyGuard, Owned {
    // ============ EVENTS & ERRORS ============
    error PoolAlreadyDeployed(address pool);

    event PoolDeployed(
        address indexed pool,
        address indexed owner,
        bytes32 salt,
        uint256 allPoolsLength
    );

    // ============ STORAGE ============
    mapping(address => bool) public poolExists;
    address[] public allPools;
    address public proswapFactory;
    address public proswapRouter;

    // ============ CONSTRUCTOR ============
    /// @notice Initializes the factory with an owner and fixed Proswap endpoints
    /// @param _owner The owner address
    /// @param _proswapFactory The Proswap factory address
    /// @param _proswapRouter The Proswap router address
    constructor(
        address _owner,
        address _proswapFactory,
        address _proswapRouter
    ) Owned(_owner) {
        proswapFactory = _proswapFactory;
        proswapRouter = _proswapRouter;
    }

    // ============ DEPLOYMENT API ============
    /// @notice Deploy a new ProratedPool with deterministic salt
    /// @param config The `ProratedPool.PoolConfig` configuration struct
    /// @param salt The user-provided salt for CREATE2 (must be unique)
    /// @return pool The address of the deployed pool
    function createPool(
        ProratedPool.PoolConfig memory config,
        bytes32 salt
    ) external nonReentrant returns (address pool) {
        // Step 1: Assemble bytecode with constructor args (factory injects endpoints via constructor)
        bytes memory bytecode = abi.encodePacked(
            type(ProratedPool).creationCode,
            abi.encode(config, proswapFactory, proswapRouter)
        );

        // Step 2: Compute expected address and revert if already deployed
        address predicted = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            keccak256(bytecode)
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

        // Step 4: Deploy via CREATE2
        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        // Step 5: Record and emit
        poolExists[pool] = true;
        allPools.push(pool);
        emit PoolDeployed(pool, config.owner, salt, allPools.length);
    }

    // ============ VIEWS ============
    /// @notice Returns number of deployed pools
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }
}
