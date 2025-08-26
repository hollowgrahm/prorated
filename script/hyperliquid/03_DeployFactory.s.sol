// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";

contract DeployFactory is Script {
    function run(
        address proswapFactory,
        address proswapRouter,
        address tokenDeployer,
        address pairDeployer,
        address liquidityDeployer,
        address veNFTDeployer,
        address governorDeployer,
        address treasuryDeployer,
        address prolendDeployer
    ) external {
        vm.startBroadcast();

        console.log("=== Deploying Prorated Factory ===");
        console.log("Deployer:", msg.sender);

        // Deploy DemoProratedFactory
        console.log("Deploying DemoProratedFactory...");
        DemoProratedFactory factory = new DemoProratedFactory(
            msg.sender,
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
        console.log("NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS=", address(factory));

        console.log("=== Factory Deployment Complete ===");

        vm.stopBroadcast();
    }
}
