// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedPool.sol";

contract DeployLaunchedEcosystem is Script {
    function run(address launchedPoolAddress) external {
        vm.startBroadcast();

        console.log("=== Deploying Launched Pool Ecosystem ===");
        console.log("Deployer:", msg.sender);

        DemoProratedPool pool = DemoProratedPool(launchedPoolAddress);

        // Deploy Token
        console.log("1/6 Deploying token...");
        pool.deployToken();
        console.log("Token deployed");

        // Deploy Pair
        console.log("2/6 Deploying trading pair...");
        pool.deployPair();
        console.log("Trading pair deployed");

        // Deploy Liquidity
        console.log("3/6 Deploying liquidity...");
        pool.deployLiquidity();
        console.log("Liquidity deployed");

        // Deploy VeNFT
        console.log("4/6 Deploying veNFT...");
        pool.deployVeNFT();
        console.log("VeNFT deployed");

        // Deploy Governor
        console.log("5/6 Deploying governor...");
        pool.deployGovernor();
        console.log("Governor deployed");

        // Deploy Treasury
        console.log("6/6 Deploying treasury...");
        pool.deployTreasury();
        console.log("Treasury deployed");

        // Note: Skipping Prolend deployment due to gas limit issues on testnet
        console.log(
            "Prolend deployment skipped for testnet (gas limit issues)"
        );

        console.log("=== Launched Pool Ecosystem Complete ===");

        vm.stopBroadcast();
    }
}
