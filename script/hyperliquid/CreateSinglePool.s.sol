// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";
import "../../src/demo/MockUSDC.sol";

contract CreateSinglePool is Script {
    function run(
        address factoryAddress,
        address mockUSDCAddress,
        string memory poolType
    ) external {
        vm.startBroadcast();

        console.log("=== Creating Single Demo Pool ===");
        console.log("Pool Type:", poolType);
        console.log("Deployer:", msg.sender);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);
        uint256 currentTime = block.timestamp;

        address pool;

        if (keccak256(bytes(poolType)) == keccak256(bytes("active"))) {
            pool = createActivePool(factory, mockUSDC, currentTime);
        } else if (keccak256(bytes(poolType)) == keccak256(bytes("failed"))) {
            pool = createFailedPool(factory, mockUSDC, currentTime);
        } else if (keccak256(bytes(poolType)) == keccak256(bytes("success"))) {
            pool = createSuccessPool(factory, mockUSDC, currentTime);
        } else if (keccak256(bytes(poolType)) == keccak256(bytes("launched"))) {
            pool = createLaunchedPool(factory, mockUSDC, currentTime);
        } else {
            revert("Invalid pool type");
        }

        console.log("Pool created and funded at:", pool);
        vm.stopBroadcast();
    }

    function createActivePool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC,
        uint256 currentTime
    ) internal returns (address) {
        console.log("Creating DemoActive pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "DemoActive",
                tokenSymbol: "DEMO",
                tokenTotalSupply: 10000000 * 10 ** 18,
                developmentFund: 100000 * 10 ** 6,
                liquidityFund: 900000 * 10 ** 6,
                startTime: currentTime - 1 hours,
                endTime: currentTime + 7 days,
                fundingToken: address(mockUSDC),
                developerPercent: 30,
                treasuryPercent: 25,
                daoPercent: 45
            });

        address pool = factory.createPool(config, bytes32("demo-active"));
        mockUSDC.addDemoContract(pool);
        fundPool(mockUSDC, pool, 100000 * 10 ** 6); // 100K USDC
        console.log("DemoActive pool funded with 100K USDC");
        return pool;
    }

    function createFailedPool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC,
        uint256 currentTime
    ) internal returns (address) {
        console.log("Creating DemoFailed pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "DemoFailed",
                tokenSymbol: "FAIL",
                tokenTotalSupply: 8000000 * 10 ** 18,
                developmentFund: 400000 * 10 ** 6,
                liquidityFund: 1600000 * 10 ** 6,
                startTime: currentTime - 10 days,
                endTime: currentTime - 3 days,
                fundingToken: address(mockUSDC),
                developerPercent: 20,
                treasuryPercent: 30,
                daoPercent: 50
            });

        address pool = factory.createPool(config, bytes32("demo-failed"));
        mockUSDC.addDemoContract(pool);

        // Use time manipulation to fund past pool
        DemoProratedPool poolContract = DemoProratedPool(pool);
        poolContract.rewindTime(8 days);
        fundPool(mockUSDC, pool, 600000 * 10 ** 6); // 600K USDC (insufficient)
        poolContract.skipTime(8 days);
        console.log("DemoFailed pool funded with 600K USDC (insufficient)");
        return pool;
    }

    function createSuccessPool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC,
        uint256 currentTime
    ) internal returns (address) {
        console.log("Creating DemoSuccess pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "DemoSuccess",
                tokenSymbol: "SUCC",
                tokenTotalSupply: 5000000 * 10 ** 18,
                developmentFund: 375000 * 10 ** 6,
                liquidityFund: 1125000 * 10 ** 6,
                startTime: currentTime - 6 days,
                endTime: currentTime - 1 days,
                fundingToken: address(mockUSDC),
                developerPercent: 25,
                treasuryPercent: 35,
                daoPercent: 40
            });

        address pool = factory.createPool(config, bytes32("demo-success"));
        mockUSDC.addDemoContract(pool);

        // Use time manipulation to fund past pool
        DemoProratedPool poolContract = DemoProratedPool(pool);
        poolContract.rewindTime(4 days);
        fundPool(mockUSDC, pool, 1500000 * 10 ** 6); // 1.5M USDC (fully funded)
        poolContract.skipTime(4 days);
        console.log("DemoSuccess pool funded with 1.5M USDC (fully funded)");
        return pool;
    }

    function createLaunchedPool(
        DemoProratedFactory factory,
        MockUSDC mockUSDC,
        uint256 currentTime
    ) internal returns (address) {
        console.log("Creating DemoLaunched pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "Prorated Protocol",
                tokenSymbol: "PRO",
                tokenTotalSupply: 21000000 * 10 ** 18,
                developmentFund: 750000 * 10 ** 6,
                liquidityFund: 2250000 * 10 ** 6,
                startTime: currentTime - 30 days,
                endTime: currentTime - 23 days,
                fundingToken: address(mockUSDC),
                developerPercent: 25,
                treasuryPercent: 25,
                daoPercent: 50
            });

        address pool = factory.createPool(config, bytes32("demo-launched"));
        mockUSDC.addDemoContract(pool);

        // Use time manipulation to fund past pool
        DemoProratedPool poolContract = DemoProratedPool(pool);
        poolContract.rewindTime(25 days);
        fundPool(mockUSDC, pool, 3000000 * 10 ** 6); // 3M USDC (fully funded)
        poolContract.skipTime(25 days);
        console.log("DemoLaunched pool funded with 3M USDC (fully funded)");
        return pool;
    }

    function fundPool(
        MockUSDC mockUSDC,
        address poolAddress,
        uint256 amount
    ) internal {
        // Mint exact amount needed
        mockUSDC.mint(amount);
        mockUSDC.approve(poolAddress, amount);
        DemoProratedPool(poolAddress).contribute(amount, 52);
    }
}
