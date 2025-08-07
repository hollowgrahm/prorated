// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import {ProswapFactory} from "../src/proswap/ProswapFactory.sol";
import {ProswapRouter} from "../src/proswap/ProswapRouter.sol";
import {ERC20Mintable} from "./mocks/ERC20Mintable.sol";
import {IProswapFactory} from "../src/interfaces/IProswapFactory.sol";
import {IProswapPair} from "../src/interfaces/IProswapPair.sol";
import {ProswapLibrary} from "../src/proswap/ProswapLibrary.sol";

contract ProswapFeeTest is Test {
    ProswapFactory factory;
    ProswapRouter router;
    ERC20Mintable tokenA;
    ERC20Mintable tokenB;
    address owner = address(1);
    address user = address(2);

    function setUp() public {
        vm.startPrank(owner);

        factory = new ProswapFactory(owner);
        router = new ProswapRouter(address(factory));

        tokenA = new ERC20Mintable("Token A", "TKA");
        tokenB = new ERC20Mintable("Token B", "TKB");

        tokenA.mint(10000e18, user);
        tokenB.mint(10000e18, user);

        vm.stopPrank();
    }

    function test_ProtocolFeeCollection() public {
        vm.startPrank(user);

        address pair = factory.createPair(address(tokenA), address(tokenB));

        tokenA.approve(pair, type(uint256).max);
        tokenB.approve(pair, type(uint256).max);

        tokenA.transfer(pair, 1000e18);
        tokenB.transfer(pair, 1000e18);

        IProswapPair(pair).mint(user);

        uint256 swapAmount = 100e18;

        tokenA.transfer(pair, swapAmount);

        (uint112 reserve80, uint112 reserve20, ) = IProswapPair(pair)
            .getReserves();
        uint256 expectedOutput = ProswapLibrary.getAmountOut(
            swapAmount,
            reserve80,
            reserve20
        );

        IProswapPair(pair).swap(0, expectedOutput, user, "");

        vm.stopPrank();

        uint256 expectedProtocolFee = (swapAmount * 25 * 3) / (100 * 1000); // 0.075%
        assertEq(
            factory.protocolFees(address(tokenA)),
            expectedProtocolFee,
            "Protocol fee not collected correctly"
        );
    }

    function test_ProtocolFeeWithdrawal() public {
        vm.startPrank(user);

        address pair = factory.createPair(address(tokenA), address(tokenB));

        tokenA.approve(pair, type(uint256).max);
        tokenB.approve(pair, type(uint256).max);

        tokenA.transfer(pair, 1000e18);
        tokenB.transfer(pair, 1000e18);

        IProswapPair(pair).mint(user);

        uint256 swapAmount = 100e18;

        tokenA.transfer(pair, swapAmount);

        (uint112 reserve80, uint112 reserve20, ) = IProswapPair(pair)
            .getReserves();
        uint256 expectedOutput = ProswapLibrary.getAmountOut(
            swapAmount,
            reserve80,
            reserve20
        );

        IProswapPair(pair).swap(0, expectedOutput, user, "");

        vm.stopPrank();

        uint256 initialBalance = tokenA.balanceOf(owner);

        vm.prank(owner);
        factory.withdrawProtocolFees(address(tokenA));

        uint256 finalBalance = tokenA.balanceOf(owner);
        uint256 expectedProtocolFee = (swapAmount * 25 * 3) / (100 * 1000);

        assertEq(
            finalBalance - initialBalance,
            expectedProtocolFee,
            "Protocol fee withdrawal failed"
        );
        assertEq(
            factory.protocolFees(address(tokenA)),
            0,
            "Protocol fees not reset after withdrawal"
        );
    }

    function test_ProtocolFeeUpdate() public {
        vm.startPrank(owner);

        assertEq(
            factory.getProtocolFeePercentage(),
            2500,
            "Initial protocol fee should be 25%"
        );

        factory.setProtocolFee(30, 100);

        assertEq(
            factory.getProtocolFeePercentage(),
            3000,
            "Protocol fee should be updated to 30%"
        );

        vm.stopPrank();
    }

    function test_ProtocolFeeCalculation() public {
        uint256 amountIn = 1000e18;
        uint256 expectedFee = (amountIn * 25 * 3) / (100 * 1000); // 0.075%

        uint256 calculatedFee = factory.calculateProtocolFee(amountIn);
        assertEq(
            calculatedFee,
            expectedFee,
            "Protocol fee calculation incorrect"
        );
    }

    function test_MaxProtocolFeeLimit() public {
        vm.startPrank(owner);

        vm.expectRevert();
        factory.setProtocolFee(60, 100);

        factory.setProtocolFee(50, 100);
        assertEq(
            factory.getProtocolFeePercentage(),
            5000,
            "Should allow 50% protocol fee"
        );

        vm.stopPrank();
    }
}
