// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {MockUSDC} from "../../src/demo/MockUSDC.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract DeployMockUSDC is DeploymentHelpers {
    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying MockUSDC ===");

        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));

        // Claim some USDC for the deployer
        mockUSDC.faucet();
        console.log("Claimed 10,000 USDC for deployer");

        // Verify functionality works
        require(
            mockUSDC.balanceOf(msg.sender) == 10000 * 10 ** 6,
            "Faucet failed"
        );

        // Verify deployment succeeded
        verifyDeploymentAndLog(address(mockUSDC), "MockUSDC");

        vm.stopBroadcast();
    }
}
