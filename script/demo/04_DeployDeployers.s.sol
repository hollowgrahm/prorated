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
    function run() external {
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

        // ProlendDeployer needs a real ProlendFactory address
        // Read from environment file (deployed in previous step)
        string memory envContent = vm.readFile("frontend/.env.local");
        
        // Parse ProlendFactory address from env file
        // This is a simplified parser - in production we'd want more robust parsing
        bytes memory envBytes = bytes(envContent);
        address prolendFactoryAddr;
        
        // Look for "NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS="
        bytes memory searchPattern = bytes("NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS=");
        bool found = false;
        
        for (uint256 i = 0; i <= envBytes.length - searchPattern.length; i++) {
            bool isMatch = true;
            for (uint256 j = 0; j < searchPattern.length; j++) {
                if (envBytes[i + j] != searchPattern[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                // Found the pattern, now extract the address (42 chars: 0x + 40 hex chars)
                bytes memory addrBytes = new bytes(42);
                for (uint256 k = 0; k < 42; k++) {
                    addrBytes[k] = envBytes[i + searchPattern.length + k];
                }
                string memory addrStr = string(addrBytes);
                prolendFactoryAddr = parseAddress(addrStr);
                found = true;
                break;
            }
        }
        
        require(found, "ProlendFactory address not found in env file");
        console.log("Using ProlendFactory from env:", prolendFactoryAddr);
        ProlendDeployer prolendDeployer = new ProlendDeployer(
            prolendFactoryAddr
        );
        console.log("ProlendDeployer deployed at:", address(prolendDeployer));
        console.log("  (using real ProlendFactory)");
        require(
            address(prolendDeployer).code.length > 0,
            "ProlendDeployer deployment failed"
        );
        require(
            address(prolendDeployer.prolendFactory()) == prolendFactoryAddr,
            "ProlendDeployer factory incorrect"
        );

        // Deploy and record all deployers using helper
        deployAndRecord(
            address(tokenDeployer),
            "TokenDeployer",
            "NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS"
        );
        deployAndRecord(
            address(pairDeployer),
            "PairDeployer",
            "NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS"
        );
        deployAndRecord(
            address(liquidityDeployer),
            "LiquidityDeployer",
            "NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS"
        );
        deployAndRecord(
            address(veNFTDeployer),
            "VeNFTDeployer",
            "NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS"
        );
        deployAndRecord(
            address(governorDeployer),
            "GovernorDeployer",
            "NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS"
        );
        deployAndRecord(
            address(treasuryDeployer),
            "TreasuryDeployer",
            "NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS"
        );
        deployAndRecord(
            address(prolendDeployer),
            "ProlendDeployer",
            "NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS"
        );

        vm.stopBroadcast();
    }
}
