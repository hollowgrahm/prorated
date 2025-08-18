// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @title IProlendFactory Interface
/// @notice Interface for deploying Prolend lending pairs
interface IProlendFactory {
    // ===== Events =====
    event ProlendPairDeployed(
        address indexed proswapPair,
        address indexed token80,
        address indexed token20,
        address prolendPair80,
        address prolendPair20,
        address admin
    );

    // ===== Deployment Functions =====
    /// @notice Deploys two lending pairs for a Proswap 80/20 pool (called by ProlendDeployer)
    /// @param pool The ProratedPool address (for admin identification)
    /// @return prolendPair80 Address of the lending pair with token80 as asset
    /// @return prolendPair20 Address of the lending pair with token20 as asset
    function deployProlendPairs(
        address pool
    ) external returns (address prolendPair80, address prolendPair20);

    /// @notice Deploys two lending pairs for a Proswap 80/20 pool (public interface)
    /// @param proswapPair The address of the Proswap pair (80/20 pool)
    /// @param admin The admin address (typically the ProratedPool developer)
    /// @return prolendPair80 Address of the lending pair with token80 as asset
    /// @return prolendPair20 Address of the lending pair with token20 as asset
    function deployProlendPairs(
        address proswapPair,
        address admin
    ) external returns (address prolendPair80, address prolendPair20);

    // ===== View Functions =====
    /// @notice Gets the deployed Prolend pairs for a given Proswap pair
    /// @param proswapPair The address of the Proswap pair
    /// @return prolendPair80 Address of the lending pair with token80 as asset
    /// @return prolendPair20 Address of the lending pair with token20 as asset
    function getProlendPairs(
        address proswapPair
    ) external view returns (address prolendPair80, address prolendPair20);

    /// @notice Checks if Prolend pairs have been deployed for a Proswap pair
    /// @param proswapPair The address of the Proswap pair
    /// @return deployed True if pairs have been deployed
    function isPairDeployed(
        address proswapPair
    ) external view returns (bool deployed);

    /// @notice Gets all deployed Prolend pair addresses
    /// @return pairs Array of all deployed Prolend pair addresses
    function getAllProlendPairs()
        external
        view
        returns (address[] memory pairs);

    /// @notice Gets the number of deployed Prolend pairs
    /// @return count Total number of deployed pairs
    function getPairCount() external view returns (uint256 count);

    /// @notice Gets the Proswap pair address for a given Prolend pair
    /// @param prolendPair The address of the Prolend pair
    /// @return proswapPair Address of the associated Proswap pair
    function getProswapPair(
        address prolendPair
    ) external view returns (address proswapPair);

    /// @notice Gets the admin address for a given Prolend pair
    /// @param prolendPair The address of the Prolend pair
    /// @return admin Address of the pair admin
    function getPairAdmin(
        address prolendPair
    ) external view returns (address admin);
}
