// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Test} from "lib/forge-std/src/Test.sol";
import {ProlendDeployer} from "../src/deployers/ProlendDeployer.sol";
import {ProlendFactory} from "../src/prolend/ProlendFactory.sol";
import {ProlendPairBytecode} from "../src/prolend/ProlendPairBytecode.sol";
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

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata /* data */
    ) external {
        // Simple mock swap for testing
        if (amount0Out > 0) {
            MockERC20(token80).transfer(to, amount0Out);
        }
        if (amount1Out > 0) {
            MockERC20(token20).transfer(to, amount1Out);
        }
    }
}

contract MockProratedPool {
    address public proswapPair;
    address public developer;
    address public prolendPair80;
    address public prolendPair20;

    constructor(address _proswapPair, address _developer) {
        proswapPair = _proswapPair;
        developer = _developer;
    }

    function setProlendPairs(
        address _prolendPair80,
        address _prolendPair20
    ) external {
        prolendPair80 = _prolendPair80;
        prolendPair20 = _prolendPair20;
    }
}

contract ProlendDeployerTest is Test {
    ProlendDeployer deployer;
    ProlendFactory factory;
    ProlendPairBytecode bytecodeHolder;
    MockERC20 token80;
    MockERC20 token20;
    MockProswapPair proswapPair;
    MockProratedPool pool;
    address admin = address(0x1234);

    function setUp() public {
        // Deploy mock tokens and pair
        token80 = new MockERC20("Token80", "T80");
        token20 = new MockERC20("Token20", "T20");
        proswapPair = new MockProswapPair(address(token80), address(token20));

        // Deploy factory and deployer
        bytecodeHolder = new ProlendPairBytecode();
        factory = new ProlendFactory(address(bytecodeHolder));
        deployer = new ProlendDeployer(address(factory));

        // Deploy mock pool
        pool = new MockProratedPool(address(proswapPair), admin);
    }

    function testDeployProlend() public {
        // Verify initial state
        assertEq(
            pool.prolendPair80(),
            address(0),
            "Initial prolendPair80 should be zero"
        );
        assertEq(
            pool.prolendPair20(),
            address(0),
            "Initial prolendPair20 should be zero"
        );

        // Deploy Prolend pairs through the deployer
        deployer.deployProlend(address(pool));

        // Verify deployment
        assertTrue(
            pool.prolendPair80() != address(0),
            "ProlendPair80 should be deployed"
        );
        assertTrue(
            pool.prolendPair20() != address(0),
            "ProlendPair20 should be deployed"
        );
        assertTrue(
            pool.prolendPair80() != pool.prolendPair20(),
            "Pairs should be different"
        );

        // Verify factory tracking
        (address retrievedPair80, address retrievedPair20) = factory
            .getProlendPairs(address(proswapPair));
        assertEq(
            retrievedPair80,
            pool.prolendPair80(),
            "Factory should track pair80"
        );
        assertEq(
            retrievedPair20,
            pool.prolendPair20(),
            "Factory should track pair20"
        );

        // Verify factory state
        assertTrue(
            factory.isPairDeployed(address(proswapPair)),
            "Factory should mark pair as deployed"
        );
        assertEq(factory.getPairCount(), 2, "Factory should have 2 pairs");
    }

    function testDeployerPattern() public {
        // Verify the deployer follows the standard pattern:
        // 1. Takes a factory address in constructor
        // 2. Has a single deploy function that takes the pool address
        // 3. Calls the factory and then updates the pool

        // Test constructor set the factory correctly
        assertEq(
            address(deployer.prolendFactory()),
            address(factory),
            "Constructor should set factory"
        );

        // Test the deployment flow
        deployer.deployProlend(address(pool));

        // Verify the pool was updated
        assertTrue(
            pool.prolendPair80() != address(0),
            "Pool should have pair80 set"
        );
        assertTrue(
            pool.prolendPair20() != address(0),
            "Pool should have pair20 set"
        );
    }
}
