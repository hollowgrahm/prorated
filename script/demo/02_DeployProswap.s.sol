// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {ProswapFactory} from "../../src/proswap/ProswapFactory.sol";
import {ProswapRouter} from "../../src/proswap/ProswapRouter.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract DeployProswap is DeploymentHelpers {
    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying Proswap Infrastructure ===");

        // Deploy Proswap Factory
        ProswapFactory proswapFactory = new ProswapFactory(msg.sender);
        console.log("Proswap Factory deployed at:", address(proswapFactory));

        // Verify factory deployment
        require(
            address(proswapFactory).code.length > 0,
            "ProswapFactory deployment failed"
        );
        require(
            proswapFactory.owner() == msg.sender,
            "ProswapFactory owner incorrect"
        );

        // Deploy Proswap Router
        ProswapRouter proswapRouter = new ProswapRouter(
            address(proswapFactory)
        );
        console.log("Proswap Router deployed at:", address(proswapRouter));

        // Verify router deployment (factory field is private, so we can't check it)
        require(
            address(proswapRouter).code.length > 0,
            "ProswapRouter deployment failed"
        );

        // Verify deployments succeeded
        verifyDeploymentAndLog(address(proswapFactory), "ProswapFactory");
        verifyDeploymentAndLog(address(proswapRouter), "ProswapRouter");

        vm.stopBroadcast();
    }
}
