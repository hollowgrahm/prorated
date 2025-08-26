// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";
import "../../src/demo/MockUSDC.sol";

contract CreateAndFundDemoPools is Script {
    function run(address factoryAddress, address mockUSDCAddress) external {
        vm.startBroadcast();

        console.log("=== Creating and Funding Demo Pools ===");
        console.log("Deployer:", msg.sender);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);

        console.log("Factory address:", factoryAddress);
        console.log("MockUSDC address:", mockUSDCAddress);

        // Create and fund all demo pools
        address activePool = createAndFundActivePool(factory, mockUSDC);
        address failedPool = createAndFundFailedPool(factory, mockUSDC);
        address successPool = createAndFundSuccessPool(factory, mockUSDC);
        address launchedPool = createAndFundLaunchedPool(factory, mockUSDC);

        // Output pool addresses for the bash script
        console.log("DEMO_ACTIVE_POOL=", activePool);
        console.log("DEMO_FAILED_POOL=", failedPool);
        console.log("DEMO_SUCCESS_POOL=", successPool);
        console.log("DEMO_LAUNCHED_POOL=", launchedPool);

        console.log("=== Demo Pools Creation and Funding Complete ===");

        vm.stopBroadcast();
    }

    function createDemoPool(
        DemoProratedFactory factory,
        address mockUSDC,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 tokenTotalSupply,
        uint256 developmentFund,
        uint256 liquidityFund,
        uint256 startTime,
        uint256 endTime,
        bytes32 salt,
        uint256 developerPercent,
        uint256 treasuryPercent,
        uint256 daoPercent
    ) internal returns (address) {
        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: tokenName,
                tokenSymbol: tokenSymbol,
                tokenTotalSupply: tokenTotalSupply,
                developmentFund: developmentFund,
                liquidityFund: liquidityFund,
                startTime: startTime,
                endTime: endTime,
                fundingToken: mockUSDC,
                developerPercent: developerPercent,
                treasuryPercent: treasuryPercent,
                daoPercent: daoPercent
            });

        return factory.createPool(config, salt);
    }

    function fundPool(
        MockUSDC mockUSDC,
        address poolAddress,
        uint256 amount
    ) internal {
        // We need to call faucet multiple times since it only gives 10K USDC per call
        uint256 faucetAmount = 10000 * 10 ** 6; // 10K USDC per faucet call
        uint256 callsNeeded = (amount + faucetAmount - 1) / faucetAmount; // Ceiling division

        for (uint256 i = 0; i < callsNeeded; i++) {
            mockUSDC.faucet();
        }

        // Approve the pool to spend USDC
        mockUSDC.approve(poolAddress, amount);

        // Contribute to the pool with 52 weeks lock (1 year)
        DemoProratedPool pool = DemoProratedPool(poolAddress);
        pool.contribute(amount, 52); // 52 weeks
    }

    function createAndFundActivePool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC
    ) internal returns (address) {
        console.log("Creating DemoActive pool...");
        uint256 currentTime = block.timestamp;
        address pool = createDemoPool(
            factory,
            address(mockUSDC),
            "DemoActive",
            "DEMO",
            10000000 * 10 ** 18, // 10M tokens
            100000 * 10 ** 6, // 100K USDC dev fund
            900000 * 10 ** 6, // 900K USDC liquidity fund (1M total goal)
            currentTime - 1 hours, // Started 1 hour ago
            currentTime + 7 days, // Ends in 7 days
            bytes32("demo-active"),
            30,
            25,
            45 // dev 30%, treasury 25%, dao 45%
        );
        console.log("DemoActive pool created at:", pool);

        mockUSDC.addDemoContract(pool);
        fundPool(mockUSDC, pool, 100000 * 10 ** 6); // 100K USDC (10% of 1M goal)
        console.log("DemoActive pool funded with 100K USDC");
        return pool;
    }

    function createAndFundFailedPool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC
    ) internal returns (address) {
        console.log("Creating DemoFailed pool...");
        uint256 currentTime = block.timestamp;
        address pool = createDemoPool(
            factory,
            address(mockUSDC),
            "DemoFailed",
            "FAIL",
            8000000 * 10 ** 18, // 8M tokens
            400000 * 10 ** 6, // 400K USDC dev fund
            1600000 * 10 ** 6, // 1.6M USDC liquidity fund (2M total goal)
            currentTime - 10 days, // Started 10 days ago
            currentTime - 3 days, // Ended 3 days ago
            bytes32("demo-failed"),
            20,
            30,
            50 // dev 20%, treasury 30%, dao 50%
        );
        console.log("DemoFailed pool created at:", pool);

        mockUSDC.addDemoContract(pool);
        DemoProratedPool poolContract = DemoProratedPool(pool);
        poolContract.rewindTime(8 days); // Rewind to when pool was active
        fundPool(mockUSDC, pool, 600000 * 10 ** 6); // 600K USDC (30% of 2M goal, insufficient)
        poolContract.skipTime(8 days); // Restore time
        console.log("DemoFailed pool funded with 600K USDC (insufficient)");
        return pool;
    }

    function createAndFundSuccessPool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC
    ) internal returns (address) {
        console.log("Creating DemoSuccess pool...");
        uint256 currentTime = block.timestamp;
        address pool = createDemoPool(
            factory,
            address(mockUSDC),
            "DemoSuccess",
            "SUCC",
            5000000 * 10 ** 18, // 5M tokens
            375000 * 10 ** 6, // 375K USDC dev fund
            1125000 * 10 ** 6, // 1.125M USDC liquidity fund (1.5M total goal)
            currentTime - 6 days, // Started 6 days ago
            currentTime - 1 days, // Ended 1 day ago
            bytes32("demo-success"),
            25,
            35,
            40 // dev 25%, treasury 35%, dao 40%
        );
        console.log("DemoSuccess pool created at:", pool);

        mockUSDC.addDemoContract(pool);
        DemoProratedPool poolContract = DemoProratedPool(pool);
        poolContract.rewindTime(4 days); // Rewind to when pool was active
        fundPool(mockUSDC, pool, 1500000 * 10 ** 6); // 1.5M USDC (100% of goal)
        poolContract.skipTime(4 days); // Restore time
        console.log("DemoSuccess pool funded with 1.5M USDC (fully funded)");
        return pool;
    }

    function createAndFundLaunchedPool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC
    ) internal returns (address) {
        console.log("Creating DemoLaunched pool (Prorated Protocol)...");
        uint256 currentTime = block.timestamp;
        address pool = createDemoPool(
            factory,
            address(mockUSDC),
            "Prorated Protocol",
            "PRO",
            21000000 * 10 ** 18, // 21M tokens
            750000 * 10 ** 6, // 750K USDC dev fund
            2250000 * 10 ** 6, // 2.25M USDC liquidity fund (3M total goal)
            currentTime - 30 days, // Started 30 days ago
            currentTime - 23 days, // Ended 23 days ago
            bytes32("demo-launched"),
            25,
            25,
            50 // dev 25%, treasury 25%, dao 50%
        );
        console.log("DemoLaunched pool created at:", pool);

        mockUSDC.addDemoContract(pool);
        DemoProratedPool poolContract = DemoProratedPool(pool);
        poolContract.rewindTime(25 days); // Rewind to when pool was active
        fundPool(mockUSDC, pool, 3000000 * 10 ** 6); // 3M USDC (100% of goal)
        poolContract.skipTime(25 days); // Restore time
        console.log("DemoLaunched pool funded with 3M USDC (fully funded)");
        return pool;
    }
}
