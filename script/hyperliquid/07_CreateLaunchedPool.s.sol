// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";
import "../../src/demo/MockUSDC.sol";

contract CreateLaunchedPool is Script {
    function run(address factoryAddress, address mockUSDCAddress) external {
        vm.startBroadcast();

        console.log("=== Creating Launched Demo Pool (Prorated Protocol) ===");
        console.log("Deployer:", msg.sender);
        console.log("Factory:", factoryAddress);
        console.log("MockUSDC:", mockUSDCAddress);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);
        uint256 currentTime = block.timestamp;

        console.log("Creating Prorated Protocol pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "Prorated Protocol",
                tokenSymbol: "PRO",
                tokenTotalSupply: 21000000 * 10 ** 18, // 21M tokens
                developmentFund: 750000 * 10 ** 6, // 750K USDC dev fund
                liquidityFund: 2250000 * 10 ** 6, // 2.25M USDC liquidity fund
                startTime: currentTime - 30 days, // Started 30 days ago
                endTime: currentTime - 23 days, // Ended 23 days ago
                fundingToken: address(mockUSDC),
                developerPercent: 25, // 25% to dev
                treasuryPercent: 25, // 25% to treasury
                daoPercent: 50 // 50% to DAO
            });

        address pool = factory.createPool(config, bytes32("demo-launched"));
        console.log("Pool created at:", pool);

        // Add pool to MockUSDC demo contracts
        mockUSDC.addDemoContract(pool);
        console.log("Pool added to MockUSDC demo contracts");

        // Use time manipulation to fund past pool
        console.log("Using time manipulation to fund expired pool...");
        DemoProratedPool poolContract = DemoProratedPool(pool);

        console.log("Rewinding time by 25 days...");
        poolContract.rewindTime(25 days);

        // Fund pool with 3M USDC (fully funded)
        console.log("Funding pool with 3M USDC (fully funded)...");
        mockUSDC.mint(3000000 * 10 ** 6);
        mockUSDC.approve(pool, 3000000 * 10 ** 6);
        DemoProratedPool(pool).contribute(3000000 * 10 ** 6, 52); // 52 weeks lock

        console.log("Skipping time forward by 25 days...");
        poolContract.skipTime(25 days);

        console.log("Launched pool created and funded successfully!");
        console.log("Pool Address:", pool);
        console.log(
            "Status: LAUNCHED (100% funded, ready for ecosystem deployment)"
        );
        console.log("");
        console.log(
            "IMPORTANT: Save this pool address for step 08_DeployLaunchedEcosystem:"
        );
        console.log("export LAUNCHED_POOL_ADDRESS=", pool);

        vm.stopBroadcast();
    }
}
