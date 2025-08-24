// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {DemoProratedFactory} from "../../src/demo/DemoProratedFactory.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract DeployDemoFactory is DeploymentHelpers {
    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying Demo Prorated Factory ===");

        // Use the addresses from the current deployment (from environment file)
        address proswapFactory = 0x09635F643e140090A9A8Dcd712eD6285858ceBef;
        address proswapRouter = 0xc5a5C42992dECbae36851359345FE25997F5C42d;

        address tokenDeployer = 0x67d269191c92Caf3cD7723F116c85e6E9bf55933;
        address pairDeployer = 0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E;
        address liquidityDeployer = 0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690;
        address veNFTDeployer = 0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB;
        address governorDeployer = 0x9E545E3C0baAB3E08CdfD552C960A1050f373042;
        address treasuryDeployer = 0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9;
        address prolendDeployer = 0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8;

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
