// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/console.sol";
import {TokenDeployer} from "../../src/deployers/TokenDeployer.sol";
import {PairDeployer} from "../../src/deployers/PairDeployer.sol";
import {LiquidityDeployer} from "../../src/deployers/LiquidityDeployer.sol";
import {VeNFTDeployer} from "../../src/deployers/VeNFTDeployer.sol";
import {GovernorDeployer} from "../../src/deployers/GovernorDeployer.sol";
import {TreasuryDeployer} from "../../src/deployers/TreasuryDeployer.sol";
import {ProlendDeployer} from "../../src/deployers/ProlendDeployer.sol";
import {DeploymentHelpers} from "./DeploymentHelpers.sol";

contract DeployDeployers is DeploymentHelpers {
    function run(address prolendFactory) external {
        vm.startBroadcast();

        console.log("=== Deploying All Deployer Contracts ===");

        // Deploy simple deployers (no constructor args)
        TokenDeployer tokenDeployer = new TokenDeployer();
        console.log("TokenDeployer deployed at:", address(tokenDeployer));
        require(
            address(tokenDeployer).code.length > 0,
            "TokenDeployer deployment failed"
        );

        PairDeployer pairDeployer = new PairDeployer();
        console.log("PairDeployer deployed at:", address(pairDeployer));
        require(
            address(pairDeployer).code.length > 0,
            "PairDeployer deployment failed"
        );

        LiquidityDeployer liquidityDeployer = new LiquidityDeployer();
        console.log(
            "LiquidityDeployer deployed at:",
            address(liquidityDeployer)
        );
        require(
            address(liquidityDeployer).code.length > 0,
            "LiquidityDeployer deployment failed"
        );

        VeNFTDeployer veNFTDeployer = new VeNFTDeployer();
        console.log("VeNFTDeployer deployed at:", address(veNFTDeployer));
        require(
            address(veNFTDeployer).code.length > 0,
            "VeNFTDeployer deployment failed"
        );

        GovernorDeployer governorDeployer = new GovernorDeployer();
        console.log("GovernorDeployer deployed at:", address(governorDeployer));
        require(
            address(governorDeployer).code.length > 0,
            "GovernorDeployer deployment failed"
        );

        TreasuryDeployer treasuryDeployer = new TreasuryDeployer();
        console.log("TreasuryDeployer deployed at:", address(treasuryDeployer));
        require(
            address(treasuryDeployer).code.length > 0,
            "TreasuryDeployer deployment failed"
        );

        // ProlendDeployer needs a real ProlendFactory address (passed as parameter)
        console.log("Using ProlendFactory from parameter:", prolendFactory);
        ProlendDeployer prolendDeployer = new ProlendDeployer(prolendFactory);
        console.log("ProlendDeployer deployed at:", address(prolendDeployer));
        console.log("  (using real ProlendFactory)");
        require(
            address(prolendDeployer).code.length > 0,
            "ProlendDeployer deployment failed"
        );
        require(
            address(prolendDeployer.prolendFactory()) == prolendFactory,
            "ProlendDeployer factory incorrect"
        );

        // Verify all deployer deployments
        verifyDeploymentAndLog(address(tokenDeployer), "TokenDeployer");
        verifyDeploymentAndLog(address(pairDeployer), "PairDeployer");
        verifyDeploymentAndLog(address(liquidityDeployer), "LiquidityDeployer");
        verifyDeploymentAndLog(address(veNFTDeployer), "VeNFTDeployer");
        verifyDeploymentAndLog(address(governorDeployer), "GovernorDeployer");
        verifyDeploymentAndLog(address(treasuryDeployer), "TreasuryDeployer");
        verifyDeploymentAndLog(address(prolendDeployer), "ProlendDeployer");

        vm.stopBroadcast();
    }
}
