// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProlendFactory} from "../interfaces/IProlendFactory.sol";
import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {IProswapPair} from "../interfaces/IProswapPair.sol";
import {ProlendPair} from "./ProlendPair.sol";

/// @title ProlendFactory
/// @notice Factory for deploying Prolend lending pairs for Proswap 80/20 pools
/// @dev Creates two lending markets: Token80/Token20 and Token20/Token80
contract ProlendFactory is IProlendFactory {
    // ===== Storage =====

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

    // ===== Core Deployment Function =====

    /// @notice Deploys two lending pairs for a Proswap 80/20 pool
    /// @param pool The ProratedPool address (for admin identification)
    /// @dev Called by ProratedPool after successful fundraising
    function deployProlendPairs(address pool) external {
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
        ProlendPair prolendPair80 = new ProlendPair(
            token80, // asset token
            token20, // collateral token
            proswapPair // price oracle (Proswap pair)
        );

        // Deploy second lending pair: Token20 as asset, Token80 as collateral
        ProlendPair prolendPair20 = new ProlendPair(
            token20, // asset token
            token80, // collateral token
            proswapPair // price oracle (Proswap pair)
        );

        // Store the addresses
        prolendPairs[proswapPair] = PairAddresses({
            prolendPair80: address(prolendPair80),
            prolendPair20: address(prolendPair20)
        });

        // Store reverse mappings
        proswapForProlend[address(prolendPair80)] = proswapPair;
        proswapForProlend[address(prolendPair20)] = proswapPair;

        // Store admin (pool developer)
        address admin = p.developer();
        pairAdmins[address(prolendPair80)] = admin;
        pairAdmins[address(prolendPair20)] = admin;

        // Add to global tracking
        allPairs.push(address(prolendPair80));
        allPairs.push(address(prolendPair20));

        // Notify the pool about deployment
        p.setProlendPairs(address(prolendPair80), address(prolendPair20));

        // Emit deployment event
        emit ProlendPairDeployed(
            proswapPair,
            token80,
            token20,
            address(prolendPair80),
            address(prolendPair20),
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
        ProlendPair prolendPair80Contract = new ProlendPair(
            token80, // asset token
            token20, // collateral token
            proswapPair // price oracle (Proswap pair)
        );
        prolendPair80 = address(prolendPair80Contract);

        // Deploy second lending pair: Token20 as asset, Token80 as collateral
        ProlendPair prolendPair20Contract = new ProlendPair(
            token20, // asset token
            token80, // collateral token
            proswapPair // price oracle (Proswap pair)
        );
        prolendPair20 = address(prolendPair20Contract);

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
}
