// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/deployers/TokenDeployer.sol";
import "../../src/deployers/PairDeployer.sol";
import "../../src/deployers/LiquidityDeployer.sol";
import "../../src/deployers/VeNFTDeployer.sol";
import "../../src/deployers/GovernorDeployer.sol";
import "../../src/deployers/TreasuryDeployer.sol";
import "../../src/deployers/ProlendDeployer.sol";

contract DeployDeployers is Script {
    function run(address prolendFactory) external {
        vm.startBroadcast();

        console.log("=== Deploying Deployer Contracts ===");
        console.log("Deployer:", msg.sender);

        // Deploy TokenDeployer
        console.log("Deploying TokenDeployer...");
        TokenDeployer tokenDeployer = new TokenDeployer();
        console.log(
            "NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS=",
            address(tokenDeployer)
        );

        // Deploy PairDeployer
        console.log("Deploying PairDeployer...");
        PairDeployer pairDeployer = new PairDeployer();
        console.log(
            "NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS=",
            address(pairDeployer)
        );

        // Deploy LiquidityDeployer
        console.log("Deploying LiquidityDeployer...");
        LiquidityDeployer liquidityDeployer = new LiquidityDeployer();
        console.log(
            "NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS=",
            address(liquidityDeployer)
        );

        // Deploy VeNFTDeployer
        console.log("Deploying VeNFTDeployer...");
        VeNFTDeployer veNFTDeployer = new VeNFTDeployer();
        console.log(
            "NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS=",
            address(veNFTDeployer)
        );

        // Deploy GovernorDeployer
        console.log("Deploying GovernorDeployer...");
        GovernorDeployer governorDeployer = new GovernorDeployer();
        console.log(
            "NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS=",
            address(governorDeployer)
        );

        // Deploy TreasuryDeployer
        console.log("Deploying TreasuryDeployer...");
        TreasuryDeployer treasuryDeployer = new TreasuryDeployer();
        console.log(
            "NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS=",
            address(treasuryDeployer)
        );

        // Deploy ProlendDeployer
        console.log("Deploying ProlendDeployer...");
        ProlendDeployer prolendDeployer = new ProlendDeployer(prolendFactory);
        console.log(
            "NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS=",
            address(prolendDeployer)
        );

        console.log("=== Deployer Contracts Complete ===");

        vm.stopBroadcast();
    }
}
