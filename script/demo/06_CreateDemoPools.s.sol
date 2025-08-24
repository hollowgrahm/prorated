// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {DemoProratedFactory} from "../../src/demo/DemoProratedFactory.sol";
import {DemoProratedPool} from "../../src/demo/DemoProratedPool.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract CreateDemoPools is DeploymentHelpers {
    function run() external {
        vm.startBroadcast();

        console.log("=== Creating Demo Pools ===");

        // Use the deployed factory and USDC addresses from current deployment
        address factoryAddr = 0xf5059a5D33d5853360D16C683c16e67980206f36; // Latest factory deployment
        address mockUSDC = 0x4A679253410272dd5232B3Ff7cF5dbB88f295319; // From Step 1 deployment

        DemoProratedFactory factory = DemoProratedFactory(factoryAddr);

        uint256 currentTime = block.timestamp;

        // Create 1 active pool
        address activePool = factory.createPool(
            DemoProratedPool.PoolConfig({
                owner: msg.sender,
                tokenName: "Demo Active Token",
                tokenSymbol: "DACTIVE",
                tokenTotalSupply: 1000000 * 10 ** 18,
                developmentFund: 25000 * 10 ** 6, // 25K USDC
                liquidityFund: 25000 * 10 ** 6, // 25K USDC
                startTime: currentTime - 1 hours,
                endTime: currentTime + 7 days,
                fundingToken: mockUSDC,
                developerPercent: 40,
                treasuryPercent: 30,
                daoPercent: 30
            }),
            bytes32("demo-active")
        );

        console.log("Demo Active Pool created at:", activePool);

        // Create 1 successful pool (ended, reached minimum)
        address successfulPool = factory.createPool(
            DemoProratedPool.PoolConfig({
                owner: msg.sender,
                tokenName: "Demo Success Token",
                tokenSymbol: "DSUCCESS",
                tokenTotalSupply: 500000 * 10 ** 18,
                developmentFund: 15000 * 10 ** 6, // 15K USDC
                liquidityFund: 15000 * 10 ** 6, // 15K USDC
                startTime: currentTime - 6 days,
                endTime: currentTime - 1 days,
                fundingToken: mockUSDC,
                developerPercent: 40,
                treasuryPercent: 30,
                daoPercent: 30
            }),
            bytes32("demo-success")
        );

        console.log("Demo Successful Pool created at:", successfulPool);

        // Verify pool deployments
        verifyDeploymentAndLog(activePool, "DemoActivePool");
        verifyDeploymentAndLog(successfulPool, "DemoSuccessfulPool");

        vm.stopBroadcast();
    }
}
