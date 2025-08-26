// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/MockUSDC.sol";
import "../../src/demo/DemoProratedPool.sol";

contract FundDemoPools is Script {
    function run(
        address mockUSDCAddress,
        address activePoolAddress,
        address failedPoolAddress,
        address successPoolAddress,
        address launchedPoolAddress
    ) external {
        vm.startBroadcast();

        console.log("=== Funding Demo Pools ===");
        console.log("Deployer:", msg.sender);

        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);

        // Fund Active Pool (10% progress - 500K out of 5M)
        console.log("Funding DemoActive pool (10% progress)...");
        fundPool(mockUSDC, activePoolAddress, 500000 * 10 ** 6); // 500K USDC

        // Fund Failed Pool (30% progress - 2.4M out of 8M, but not enough)
        console.log("Funding DemoFailed pool (30% progress, insufficient)...");
        fundPool(mockUSDC, failedPoolAddress, 2400000 * 10 ** 6); // 2.4M USDC

        // Fund Successful Pool (100% progress - 5M out of 5M)
        console.log("Funding DemoSuccess pool (100% progress)...");
        fundPool(mockUSDC, successPoolAddress, 5000000 * 10 ** 6); // 5M USDC

        // Fund Launched Pool (100% progress - 30M out of 30M)
        console.log("Funding DemoLaunched pool (100% progress)...");
        fundPool(mockUSDC, launchedPoolAddress, 30000000 * 10 ** 6); // 30M USDC

        console.log("=== Demo Pool Funding Complete ===");

        vm.stopBroadcast();
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

        console.log("Funded pool with USDC:", amount / 10 ** 6);
    }
}
