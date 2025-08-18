// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Test} from "lib/forge-std/src/Test.sol";
import {ProlendFactory} from "../src/prolend/ProlendFactory.sol";
import {ProlendPairBytecode} from "../src/prolend/ProlendPairBytecode.sol";
import {ProlendPair} from "../src/prolend/ProlendPair.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

// Mock contracts for testing
contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol, 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockProswapPair {
    address public token80;
    address public token20;
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    constructor(address _token80, address _token20) {
        token80 = _token80;
        token20 = _token20;
        reserve0 = 1000 ether;
        reserve1 = 1000 ether;
        blockTimestampLast = uint32(block.timestamp);
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function setReserves(uint112 _reserve0, uint112 _reserve1) external {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
        blockTimestampLast = uint32(block.timestamp);
    }

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata /* data */
    ) external {
        // Simple mock swap - transfer the requested amounts
        if (amount0Out > 0) {
            MockERC20(token80).transfer(to, amount0Out);
        }
        if (amount1Out > 0) {
            MockERC20(token20).transfer(to, amount1Out);
        }
    }
}

contract ProlendFactoryTest is Test {
    ProlendFactory factory;
    ProlendPairBytecode bytecodeHolder;
    MockERC20 token80;
    MockERC20 token20;
    MockProswapPair proswapPair;
    address admin = address(0x1234);

    function setUp() public {
        bytecodeHolder = new ProlendPairBytecode();
        factory = new ProlendFactory(address(bytecodeHolder));
        token80 = new MockERC20("Token80", "T80");
        token20 = new MockERC20("Token20", "T20");
        proswapPair = new MockProswapPair(address(token80), address(token20));
    }

    function testDeployProlendPairs() public {
        // Deploy Prolend pairs
        (address prolendPair80, address prolendPair20) = factory
            .deployProlendPairs(address(proswapPair), admin);

        // Verify deployment
        assertTrue(
            prolendPair80 != address(0),
            "ProlendPair80 should be deployed"
        );
        assertTrue(
            prolendPair20 != address(0),
            "ProlendPair20 should be deployed"
        );
        assertTrue(prolendPair80 != prolendPair20, "Pairs should be different");

        // Verify getProlendPairs
        (address retrievedPair80, address retrievedPair20) = factory
            .getProlendPairs(address(proswapPair));
        assertEq(
            retrievedPair80,
            prolendPair80,
            "Retrieved pair80 should match"
        );
        assertEq(
            retrievedPair20,
            prolendPair20,
            "Retrieved pair20 should match"
        );

        // Verify isPairDeployed
        assertTrue(
            factory.isPairDeployed(address(proswapPair)),
            "Pair should be marked as deployed"
        );

        // Verify admin mapping
        assertEq(
            factory.getPairAdmin(prolendPair80),
            admin,
            "Admin should be set for pair80"
        );
        assertEq(
            factory.getPairAdmin(prolendPair20),
            admin,
            "Admin should be set for pair20"
        );

        // Verify pair count
        assertEq(factory.getPairCount(), 2, "Should have 2 pairs deployed");

        // Verify all pairs array
        address[] memory allPairs = factory.getAllProlendPairs();
        assertEq(allPairs.length, 2, "Should return 2 pairs");
        assertEq(allPairs[0], prolendPair80, "First pair should be pair80");
        assertEq(allPairs[1], prolendPair20, "Second pair should be pair20");
    }

    function testCannotDeployTwice() public {
        // Deploy once
        factory.deployProlendPairs(address(proswapPair), admin);

        // Try to deploy again - should revert
        vm.expectRevert("Prolend pairs already deployed");
        factory.deployProlendPairs(address(proswapPair), admin);
    }

    function testInvalidInputs() public {
        // Test zero proswap pair
        vm.expectRevert("Invalid Proswap pair");
        factory.deployProlendPairs(address(0), admin);

        // Test zero admin
        vm.expectRevert("Invalid admin");
        factory.deployProlendPairs(address(proswapPair), address(0));
    }

    function testProlendPairConfiguration() public {
        // Deploy pairs
        (address prolendPair80Address, address prolendPair20Address) = factory
            .deployProlendPairs(address(proswapPair), admin);

        // Cast to ProlendPair contracts
        ProlendPair prolendPair80 = ProlendPair(prolendPair80Address);
        ProlendPair prolendPair20 = ProlendPair(prolendPair20Address);

        // Verify asset/collateral configuration for pair80
        assertEq(
            address(prolendPair80.asset()),
            address(token80),
            "Pair80 asset should be token80"
        );
        assertEq(
            address(prolendPair80.collateralToken()),
            address(token20),
            "Pair80 collateral should be token20"
        );
        assertEq(
            address(prolendPair80.proswapPair()),
            address(proswapPair),
            "Pair80 oracle should be proswap pair"
        );

        // Verify asset/collateral configuration for pair20
        assertEq(
            address(prolendPair20.asset()),
            address(token20),
            "Pair20 asset should be token20"
        );
        assertEq(
            address(prolendPair20.collateralToken()),
            address(token80),
            "Pair20 collateral should be token80"
        );
        assertEq(
            address(prolendPair20.proswapPair()),
            address(proswapPair),
            "Pair20 oracle should be proswap pair"
        );
    }
}
