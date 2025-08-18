// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {IProratedPool} from "../interfaces/IProratedPool.sol";
import {IProlendFactory} from "../interfaces/IProlendFactory.sol";

/// @title ProlendDeployer
/// @notice Deployer contract that calls ProlendFactory to create lending pairs
/// @dev Follows the same pattern as TokenDeployer, PairDeployer, etc.
contract ProlendDeployer {
    /// @notice The ProlendFactory instance used to create lending pairs
    IProlendFactory public immutable prolendFactory;

    /// @notice Constructor to set the ProlendFactory address
    /// @param _prolendFactory Address of the ProlendFactory contract
    constructor(address _prolendFactory) {
        prolendFactory = IProlendFactory(_prolendFactory);
    }

    /// @notice Deploys Prolend lending pairs for a ProratedPool
    /// @param pool The ProratedPool address that will receive the deployed pair addresses
    /// @dev Called by ProratedPool.deployProlend() function
    function deployProlend(address pool) external {
        // Call the ProlendFactory to deploy the pairs
        (address prolendPair80, address prolendPair20) = prolendFactory
            .deployProlendPairs(pool);

        // Set the deployed pair addresses on the pool
        IProratedPool(pool).setProlendPairs(prolendPair80, prolendPair20);
    }
}
