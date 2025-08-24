// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {DemoProratedFactory} from "../../src/demo/DemoProratedFactory.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract DeployProrated is DeploymentHelpers {
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

        console.log("=== Deploying Demo Prorated Factory ===");

        // Addresses passed as parameters from bash script

        console.log("Using Proswap Factory:", proswapFactory);
        console.log("Using Proswap Router:", proswapRouter);
        console.log("Using TokenDeployer:", tokenDeployer);

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

        console.log("Demo Prorated Factory deployed at:", address(factory));

        // Verify deployment succeeded
        require(
            address(factory).code.length > 0,
            "DemoProratedFactory deployment failed"
        );
        require(factory.getPoolCount() == 0, "Factory pool count should be 0");
        require(
            factory.proswapFactory() == proswapFactory,
            "Factory proswapFactory incorrect"
        );
        require(
            factory.proswapRouter() == proswapRouter,
            "Factory proswapRouter incorrect"
        );
        require(
            factory.tokenDeployer() == tokenDeployer,
            "Factory tokenDeployer incorrect"
        );

        // Verify deployment succeeded
        verifyDeploymentAndLog(address(factory), "DemoProratedFactory");

        vm.stopBroadcast();
    }
}
