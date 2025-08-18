// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProlendFactory} from "../interfaces/IProlendFactory.sol";
import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {IProswapPair} from "../interfaces/IProswapPair.sol";
import {ProlendPair} from "./ProlendPair.sol";
import {SSTORE2} from "solady/utils/SSTORE2.sol";

/// @title ProlendFactory
/// @notice Factory for deploying Prolend lending pairs for Proswap 80/20 pools
/// @dev Creates two lending markets: Token80/Token20 and Token20/Token80
contract ProlendFactory is IProlendFactory {
    // ===== Storage =====

    /// @notice SSTORE2 pointer for ProlendPair bytecode
    address public immutable pairBytecodePointer;

    /// @notice Mapping from Proswap pair to deployed Prolend pairs
    mapping(address => PairAddresses) public prolendPairs;

    /// @notice Mapping from Prolend pair to its Proswap pair
    mapping(address => address) public proswapForProlend;

    /// @notice Mapping from Prolend pair to its admin
    mapping(address => address) public pairAdmins;

    /// @notice Array of all deployed Prolend pairs
    address[] public allPairs;

    /// @notice Struct to store both Prolend pair addresses
    struct PairAddresses {
        address prolendPair80; // Token80 as asset, Token20 as collateral
        address prolendPair20; // Token20 as asset, Token80 as collateral
    }

    // ===== Constructor =====

    /// @notice Initialize the factory and store ProlendPair bytecode using SSTORE2
    constructor() {
        // Store ProlendPair bytecode using SSTORE2
        pairBytecodePointer = SSTORE2.write(type(ProlendPair).creationCode);
    }

    // ===== Core Deployment Function =====

    /// @notice Deploys two lending pairs for a Proswap 80/20 pool
    /// @param pool The ProratedPool address (for admin identification)
    /// @dev Called by ProlendDeployer after successful fundraising
    /// @return prolendPair80 Address of the lending pair with token80 as asset
    /// @return prolendPair20 Address of the lending pair with token20 as asset
    function deployProlendPairs(
        address pool
    ) external returns (address prolendPair80, address prolendPair20) {
        IProratedPool p = IProratedPool(pool);

        // Get the Proswap pair from the pool
        address proswapPair = p.proswapPair();
        require(proswapPair != address(0), "Proswap pair not deployed");

        // Check if already deployed
        require(
            prolendPairs[proswapPair].prolendPair80 == address(0),
            "Prolend pairs already deployed"
        );

        // Get tokens from the Proswap pair
        IProswapPair pair = IProswapPair(proswapPair);
        address token80 = pair.token80();
        address token20 = pair.token20();

        // Deploy first lending pair: Token80 as asset, Token20 as collateral
        address pair80Contract = _deployProlendPair(
            token80, // asset token
            token20, // collateral token
            proswapPair, // price oracle (Proswap pair)
            keccak256(abi.encodePacked(proswapPair, "80")) // salt
        );

        // Deploy second lending pair: Token20 as asset, Token80 as collateral
        address pair20Contract = _deployProlendPair(
            token20, // asset token
            token80, // collateral token
            proswapPair, // price oracle (Proswap pair)
            keccak256(abi.encodePacked(proswapPair, "20")) // salt
        );

        // Store the addresses
        prolendPairs[proswapPair] = PairAddresses({
            prolendPair80: pair80Contract,
            prolendPair20: pair20Contract
        });

        // Store reverse mappings
        proswapForProlend[pair80Contract] = proswapPair;
        proswapForProlend[pair20Contract] = proswapPair;

        // Store admin (pool developer)
        address admin = p.developer();
        pairAdmins[pair80Contract] = admin;
        pairAdmins[pair20Contract] = admin;

        // Add to global tracking
        allPairs.push(pair80Contract);
        allPairs.push(pair20Contract);

        // Return the addresses for the deployer to use
        prolendPair80 = pair80Contract;
        prolendPair20 = pair20Contract;

        // Emit deployment event
        emit ProlendPairDeployed(
            proswapPair,
            token80,
            token20,
            prolendPair80,
            prolendPair20,
            admin
        );
    }

    // ===== Public Interface =====

    /// @notice Deploys Prolend pairs for any Proswap pair (external interface)
    /// @param proswapPair The address of the Proswap pair (80/20 pool)
    /// @param admin The admin address (typically the ProratedPool developer)
    /// @return prolendPair80 Address of the lending pair with token80 as asset
    /// @return prolendPair20 Address of the lending pair with token20 as asset
    function deployProlendPairs(
        address proswapPair,
        address admin
    ) external returns (address prolendPair80, address prolendPair20) {
        require(proswapPair != address(0), "Invalid Proswap pair");
        require(admin != address(0), "Invalid admin");

        // Check if already deployed
        require(
            prolendPairs[proswapPair].prolendPair80 == address(0),
            "Prolend pairs already deployed"
        );

        // Get tokens from the Proswap pair
        IProswapPair pair = IProswapPair(proswapPair);
        address token80 = pair.token80();
        address token20 = pair.token20();

        // Deploy first lending pair: Token80 as asset, Token20 as collateral
        prolendPair80 = _deployProlendPair(
            token80, // asset token
            token20, // collateral token
            proswapPair, // price oracle (Proswap pair)
            keccak256(abi.encodePacked(proswapPair, admin, "80")) // salt
        );

        // Deploy second lending pair: Token20 as asset, Token80 as collateral
        prolendPair20 = _deployProlendPair(
            token20, // asset token
            token80, // collateral token
            proswapPair, // price oracle (Proswap pair)
            keccak256(abi.encodePacked(proswapPair, admin, "20")) // salt
        );

        // Store the addresses
        prolendPairs[proswapPair] = PairAddresses({
            prolendPair80: prolendPair80,
            prolendPair20: prolendPair20
        });

        // Store reverse mappings
        proswapForProlend[prolendPair80] = proswapPair;
        proswapForProlend[prolendPair20] = proswapPair;

        // Store admin
        pairAdmins[prolendPair80] = admin;
        pairAdmins[prolendPair20] = admin;

        // Add to global tracking
        allPairs.push(prolendPair80);
        allPairs.push(prolendPair20);

        // Emit deployment event
        emit ProlendPairDeployed(
            proswapPair,
            token80,
            token20,
            prolendPair80,
            prolendPair20,
            admin
        );
    }

    // ===== View Functions =====

    /// @notice Gets the deployed Prolend pairs for a given Proswap pair
    /// @param proswapPair The address of the Proswap pair
    /// @return prolendPair80 Address of the lending pair with token80 as asset
    /// @return prolendPair20 Address of the lending pair with token20 as asset
    function getProlendPairs(
        address proswapPair
    ) external view returns (address prolendPair80, address prolendPair20) {
        PairAddresses memory pairs = prolendPairs[proswapPair];
        return (pairs.prolendPair80, pairs.prolendPair20);
    }

    /// @notice Checks if Prolend pairs have been deployed for a Proswap pair
    /// @param proswapPair The address of the Proswap pair
    /// @return deployed True if pairs have been deployed
    function isPairDeployed(
        address proswapPair
    ) external view returns (bool deployed) {
        return prolendPairs[proswapPair].prolendPair80 != address(0);
    }

    /// @notice Gets all deployed Prolend pair addresses
    /// @return pairs Array of all deployed Prolend pair addresses
    function getAllProlendPairs()
        external
        view
        returns (address[] memory pairs)
    {
        return allPairs;
    }

    /// @notice Gets the number of deployed Prolend pairs
    /// @return count Total number of deployed pairs
    function getPairCount() external view returns (uint256 count) {
        return allPairs.length;
    }

    /// @notice Gets the Proswap pair address for a given Prolend pair
    /// @param prolendPair The address of the Prolend pair
    /// @return proswapPair Address of the associated Proswap pair
    function getProswapPair(
        address prolendPair
    ) external view returns (address proswapPair) {
        return proswapForProlend[prolendPair];
    }

    /// @notice Gets the admin address for a given Prolend pair
    /// @param prolendPair The address of the Prolend pair
    /// @return admin Address of the pair admin
    function getPairAdmin(
        address prolendPair
    ) external view returns (address admin) {
        return pairAdmins[prolendPair];
    }

    // ===== Internal Functions =====

    /// @notice Deploy a ProlendPair using CREATE2 and SSTORE2
    /// @param assetToken The asset token address
    /// @param collateralToken The collateral token address
    /// @param proswapPair The Proswap pair address for pricing
    /// @param salt The salt for CREATE2 deployment
    /// @return pair The deployed pair address
    function _deployProlendPair(
        address assetToken,
        address collateralToken,
        address proswapPair,
        bytes32 salt
    ) internal returns (address pair) {
        // Get bytecode from SSTORE2
        bytes memory pairCreationCode = SSTORE2.read(pairBytecodePointer);

        // Build constructor arguments
        bytes memory constructorArgs = abi.encode(
            assetToken,
            collateralToken,
            proswapPair
        );

        // Combine creation code with constructor arguments
        bytes memory initcode = abi.encodePacked(
            pairCreationCode,
            constructorArgs
        );

        // Deploy using CREATE2
        assembly {
            pair := create2(0, add(initcode, 32), mload(initcode), salt)
        }
        require(pair != address(0), "CREATE2_FAILED");
    }
}
