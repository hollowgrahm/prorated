// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/demo/DemoProratedFactory.sol";

contract DeployFactoryOnly is Script {
    function run() external {
        vm.startBroadcast();

        console.log("Deploying DemoProratedFactory only...");
        console.log("Deployer:", msg.sender);

        // Use the addresses that were already deployed successfully
        address owner = msg.sender;
        address proswapFactory = 0x972Dc750e059d5CD9e0221897FF33F2BB80b46B0;
        address proswapRouter = 0x5Dd298F3BD7c176d60399FE3e369ba322F1aD4Ae;
        address tokenDeployer = 0x645ED75e894F61124dfF6ba39EE9293c14b06521;
        address pairDeployer = 0x526F21D6a8C6B770823F137b629aB84c08160C37;
        address liquidityDeployer = 0x3271856384CdD17E656F4064bE7e0DD0AFAd10F0;
        address veNFTDeployer = 0xD353086e1d47aCEAaEea4626c6d5EAfC9CE3B222;
        address governorDeployer = 0x1cef162E0587557891Fbe6A98D3C69b0ddC59814;
        address treasuryDeployer = 0xA419eBB6D13bdFf90d71572E0A3d58d80d308a80;
        address prolendDeployer = 0xeBf98390d5DD4E3026B3Be942fEa24a206C2834c;

        console.log("Using existing contract addresses:");
        console.log("ProswapFactory:", proswapFactory);
        console.log("ProswapRouter:", proswapRouter);
        console.log("TokenDeployer:", tokenDeployer);
        console.log("PairDeployer:", pairDeployer);
        console.log("LiquidityDeployer:", liquidityDeployer);
        console.log("VeNFTDeployer:", veNFTDeployer);
        console.log("GovernorDeployer:", governorDeployer);
        console.log("TreasuryDeployer:", treasuryDeployer);
        console.log("ProlendDeployer:", prolendDeployer);

        console.log("Deploying DemoProratedFactory...");

        DemoProratedFactory factory = new DemoProratedFactory(
            owner,
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

        console.log("DemoProratedFactory deployed at:", address(factory));
        console.log("NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS=", address(factory));

        vm.stopBroadcast();
    }
}
