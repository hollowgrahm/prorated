// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {ProlendFactory} from "../../src/prolend/ProlendFactory.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract DeployProlend is DeploymentHelpers {
    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying Prolend Infrastructure ===");

        // Deploy Prolend Factory (no constructor args needed)
        // Note: This requires high gas due to SSTORE2.write storing ProlendPair bytecode
        ProlendFactory prolendFactory = new ProlendFactory();
        console.log("Prolend Factory deployed at:", address(prolendFactory));

        // Verify deployment succeeded before recording
        require(
            address(prolendFactory).code.length > 0,
            "ProlendFactory deployment failed - no code at address"
        );
        require(
            prolendFactory.pairBytecodePointer() != address(0),
            "ProlendFactory initialization failed - no bytecode pointer"
        );

        // Verify deployment succeeded
        verifyDeploymentAndLog(address(prolendFactory), "ProlendFactory");

        vm.stopBroadcast();
    }
}
