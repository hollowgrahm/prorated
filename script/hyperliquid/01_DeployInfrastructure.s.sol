// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/MockUSDC.sol";
import "../../src/proswap/ProswapFactory.sol";
import "../../src/proswap/ProswapRouter.sol";
import "../../src/prolend/ProlendFactory.sol";

contract DeployInfrastructure is Script {
    function run() external {
        vm.startBroadcast();

        console.log("=== Deploying Core Infrastructure ===");
        console.log("Deployer:", msg.sender);

        // Deploy MockUSDC
        console.log("Deploying MockUSDC...");
        MockUSDC mockUSDC = new MockUSDC();
        console.log("NEXT_PUBLIC_MOCK_USDC_ADDRESS=", address(mockUSDC));

        // Deploy ProswapFactory
        console.log("Deploying ProswapFactory...");
        ProswapFactory proswapFactory = new ProswapFactory(msg.sender);
        console.log(
            "NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS=",
            address(proswapFactory)
        );

        // Deploy ProswapRouter
        console.log("Deploying ProswapRouter...");
        ProswapRouter proswapRouter = new ProswapRouter(
            address(proswapFactory)
        );
        console.log(
            "NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS=",
            address(proswapRouter)
        );

        // Deploy ProlendFactory
        console.log("Deploying ProlendFactory...");
        ProlendFactory prolendFactory = new ProlendFactory();
        console.log(
            "NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS=",
            address(prolendFactory)
        );

        console.log("=== Infrastructure Deployment Complete ===");

        vm.stopBroadcast();
    }
}
