// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Test} from "lib/forge-std/src/Test.sol";
import "../src/proswap/ProswapFactory.sol";
import "../src/proswap/ProswapPair.sol";
import "./mocks/ERC20Mintable.sol";

contract ProswapFactoryTest is Test {
    ProswapFactory factory;

    ERC20Mintable token80;
    ERC20Mintable token20;

    function setUp() public {
        factory = new ProswapFactory(address(this));

        token80 = new ERC20Mintable("Token 80", "TKN80");
        token20 = new ERC20Mintable("Token 20", "TKN20");
    }

    function encodeError(
        string memory error
    ) internal pure returns (bytes memory encoded) {
        encoded = abi.encodeWithSignature(error);
    }

    function testCreatePair() public {
        address pairAddress = factory.createPair(
            address(token80),
            address(token20)
        );

        ProswapPair pair = ProswapPair(pairAddress);

        assertEq(pair.token80(), address(token80));
        assertEq(pair.token20(), address(token20));
    }

    function testCreatePairZeroAddress() public {
        vm.expectRevert(encodeError("ZeroAddress()"));
        factory.createPair(address(0), address(token80));

        vm.expectRevert(encodeError("ZeroAddress()"));
        factory.createPair(address(token20), address(0));
    }

    function testCreatePairPairExists() public {
        address pair1 = factory.createPair(address(token20), address(token80));

        address pair2 = factory.createPair(address(token80), address(token20));

        assertTrue(
            pair1 != pair2,
            "Different token orders should create different pairs"
        );

        ProswapPair pair1Contract = ProswapPair(pair1);
        ProswapPair pair2Contract = ProswapPair(pair2);

        assertEq(pair1Contract.token80(), address(token20));
        assertEq(pair1Contract.token20(), address(token80));

        assertEq(pair2Contract.token80(), address(token80));
        assertEq(pair2Contract.token20(), address(token20));
    }

    function testCreatePairIdenticalTokens() public {
        vm.expectRevert(encodeError("IdenticalAddresses()"));
        factory.createPair(address(token80), address(token80));
    }

    function testDynamicNaming() public {
        address pairAddress = factory.createPair(
            address(token80),
            address(token20)
        );

        ProswapPair pair = ProswapPair(pairAddress);

        assertEq(
            pair.name(),
            "Proswap 80 TKN80 / 20 TKN20",
            "Dynamic name should match expected format"
        );

        assertEq(
            pair.symbol(),
            "PRO-80TKN80/20TKN20",
            "Dynamic symbol should match expected format"
        );

        address pairAddress2 = factory.createPair(
            address(token20),
            address(token80)
        );

        ProswapPair pair2 = ProswapPair(pairAddress2);

        assertEq(
            pair2.name(),
            "Proswap 80 TKN20 / 20 TKN80",
            "Reversed order should have different name"
        );

        assertEq(
            pair2.symbol(),
            "PRO-80TKN20/20TKN80",
            "Reversed order should have different symbol"
        );
    }

    function testDynamicNamingExamples() public {
        ERC20Mintable weth = new ERC20Mintable("Wrapped Ether", "WETH");
        ERC20Mintable usdc = new ERC20Mintable("USD Coin", "USDC");
        ERC20Mintable dai = new ERC20Mintable("Dai Stablecoin", "DAI");

        address wethUsdcPair = factory.createPair(address(weth), address(usdc));
        ProswapPair pair1 = ProswapPair(wethUsdcPair);

        assertEq(
            pair1.name(),
            "Proswap 80 WETH / 20 USDC",
            "WETH/USDC pair should have correct name"
        );
        assertEq(
            pair1.symbol(),
            "PRO-80WETH/20USDC",
            "WETH/USDC pair should have correct symbol"
        );

        address usdcWethPair = factory.createPair(address(usdc), address(weth));
        ProswapPair pair2 = ProswapPair(usdcWethPair);

        assertEq(
            pair2.name(),
            "Proswap 80 USDC / 20 WETH",
            "USDC/WETH pair should have different name"
        );
        assertEq(
            pair2.symbol(),
            "PRO-80USDC/20WETH",
            "USDC/WETH pair should have different symbol"
        );

        address daiUsdcPair = factory.createPair(address(dai), address(usdc));
        ProswapPair pair3 = ProswapPair(daiUsdcPair);

        assertEq(
            pair3.name(),
            "Proswap 80 DAI / 20 USDC",
            "DAI/USDC pair should have correct name"
        );
        assertEq(
            pair3.symbol(),
            "PRO-80DAI/20USDC",
            "DAI/USDC pair should have correct symbol"
        );

        assertTrue(
            wethUsdcPair != usdcWethPair,
            "Different token orders should create different pairs"
        );
        assertTrue(
            wethUsdcPair != daiUsdcPair,
            "Different token combinations should create different pairs"
        );
        assertTrue(
            usdcWethPair != daiUsdcPair,
            "Different token combinations should create different pairs"
        );
    }
}
