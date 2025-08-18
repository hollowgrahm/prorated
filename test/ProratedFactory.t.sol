// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {Test} from "lib/forge-std/src/Test.sol";
import {ProratedFactory} from "../src/ProratedFactory.sol";
import {ProratedPool} from "../src/ProratedPool.sol";
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

contract MockProswapFactory {
    function createPair(address, address) external pure returns (address) {
        return address(0x1234); // Mock pair address
    }
}

contract MockProswapRouter {
    function addLiquidity(
        address,
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        address,
        uint256
    ) external pure returns (uint256, uint256, uint256) {
        return (0, 0, 0);
    }
}

contract MockDeployer {
    function deploy(address) external pure returns (address) {
        return address(0x5678); // Mock deployed contract
    }
}

contract ProratedFactoryTest is Test {
    ProratedFactory factory;
    MockERC20 fundingToken;
    MockProswapFactory proswapFactory;
    MockProswapRouter proswapRouter;
    MockDeployer tokenDeployer;
    MockDeployer pairDeployer;
    MockDeployer liquidityDeployer;
    MockDeployer veNFTDeployer;
    MockDeployer governorDeployer;
    MockDeployer treasuryDeployer;
    MockDeployer prolendDeployer;

    address owner = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);

    function setUp() public {
        // Deploy mock dependencies
        fundingToken = new MockERC20("USDC", "USDC");
        proswapFactory = new MockProswapFactory();
        proswapRouter = new MockProswapRouter();
        tokenDeployer = new MockDeployer();
        pairDeployer = new MockDeployer();
        liquidityDeployer = new MockDeployer();
        veNFTDeployer = new MockDeployer();
        governorDeployer = new MockDeployer();
        treasuryDeployer = new MockDeployer();
        prolendDeployer = new MockDeployer();

        // Deploy factory
        factory = new ProratedFactory(
            owner,
            address(proswapFactory),
            address(proswapRouter),
            address(tokenDeployer),
            address(pairDeployer),
            address(liquidityDeployer),
            address(veNFTDeployer),
            address(governorDeployer),
            address(treasuryDeployer),
            address(prolendDeployer)
        );
    }

    function testConstructor() public {
        // Test immutable variables are set correctly
        assertEq(factory.owner(), owner);
        assertEq(factory.proswapFactory(), address(proswapFactory));
        assertEq(factory.proswapRouter(), address(proswapRouter));
        assertEq(factory.tokenDeployer(), address(tokenDeployer));
        assertEq(factory.pairDeployer(), address(pairDeployer));
        assertEq(factory.liquidityDeployer(), address(liquidityDeployer));
        assertEq(factory.veNFTDeployer(), address(veNFTDeployer));
        assertEq(factory.governorDeployer(), address(governorDeployer));
        assertEq(factory.treasuryDeployer(), address(treasuryDeployer));
        assertEq(factory.prolendDeployer(), address(prolendDeployer));

        // Test SSTORE2 pointer is set
        assertTrue(factory.poolBytecodePointer() != address(0));

        // Test initial state
        assertEq(factory.allPoolsLength(), 0);
    }

    function testCreatePoolBasic() public {
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: user1,
            tokenName: "Test Token",
            tokenSymbol: "TEST",
            fundingToken: address(fundingToken),
            tokenTotalSupply: 1000000e18,
            developmentFund: 500000e18,
            liquidityFund: 500000e18,
            developerPercent: 50,
            treasuryPercent: 30,
            daoPercent: 20,
            startTime: block.timestamp + 1 hours,
            endTime: block.timestamp + 8 days
        });

        bytes32 salt = keccak256(abi.encodePacked("test", block.timestamp));

        // Create pool
        address poolAddress = factory.createPool(config, salt);

        // Verify pool was created
        assertTrue(poolAddress != address(0));
        assertTrue(factory.poolExists(poolAddress));
        assertEq(factory.allPoolsLength(), 1);
        assertEq(factory.allPools(0), poolAddress);

        // Emit event verification would be done with vm.expectEmit in practice
    }

    function testCreatePoolDuplicateSalt() public {
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: user1,
            tokenName: "Test Token",
            tokenSymbol: "TEST",
            fundingToken: address(fundingToken),
            tokenTotalSupply: 1000000e18,
            developmentFund: 500000e18,
            liquidityFund: 500000e18,
            developerPercent: 50,
            treasuryPercent: 30,
            daoPercent: 20,
            startTime: block.timestamp + 1 hours,
            endTime: block.timestamp + 8 days
        });

        bytes32 salt = keccak256(abi.encodePacked("test"));

        // Create first pool
        factory.createPool(config, salt);

        // Try to create second pool with same salt - should revert
        vm.expectRevert();
        factory.createPool(config, salt);
    }

    function testValidatePoolConfig() public {
        // Test empty token name
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: user1,
            tokenName: "",
            tokenSymbol: "TEST",
            fundingToken: address(fundingToken),
            tokenTotalSupply: 1000000e18,
            developmentFund: 500000e18,
            liquidityFund: 500000e18,
            developerPercent: 50,
            treasuryPercent: 30,
            daoPercent: 20,
            startTime: block.timestamp + 1 hours,
            endTime: block.timestamp + 8 days
        });

        bytes32 salt = keccak256(abi.encodePacked("test1"));

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test empty token symbol
        config.tokenName = "Test Token";
        config.tokenSymbol = "";

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test zero funding token
        config.tokenSymbol = "TEST";
        config.fundingToken = address(0);

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test zero token total supply
        config.fundingToken = address(fundingToken);
        config.tokenTotalSupply = 0;

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test zero development fund
        config.tokenTotalSupply = 1000000e18;
        config.developmentFund = 0;

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test zero liquidity fund
        config.developmentFund = 500000e18;
        config.liquidityFund = 0;

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test invalid percentages (not sum to 100)
        config.liquidityFund = 500000e18;
        config.developerPercent = 40;
        config.treasuryPercent = 30;
        config.daoPercent = 20; // Sum = 90, not 100

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test invalid time range (start >= end)
        config.developerPercent = 50;
        config.treasuryPercent = 30;
        config.daoPercent = 20;
        config.startTime = block.timestamp + 8 days;
        config.endTime = block.timestamp + 1 hours;

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test start time too far in future
        config.startTime = block.timestamp + 31 days;
        config.endTime = block.timestamp + 32 days;

        vm.expectRevert();
        factory.createPool(config, salt);

        // Test end time too long after start
        config.startTime = block.timestamp + 1 hours;
        config.endTime = block.timestamp + 31 days + 1 hours;

        vm.expectRevert();
        factory.createPool(config, salt);
    }

    function testMultiplePoolCreation() public {
        // Create multiple pools
        for (uint256 i = 0; i < 3; i++) {
            ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
                owner: user1,
                tokenName: string(abi.encodePacked("Test Token ", i)),
                tokenSymbol: string(abi.encodePacked("TEST", i)),
                fundingToken: address(fundingToken),
                tokenTotalSupply: 1000000e18,
                developmentFund: 500000e18,
                liquidityFund: 500000e18,
                developerPercent: 50,
                treasuryPercent: 30,
                daoPercent: 20,
                startTime: block.timestamp + 1 hours,
                endTime: block.timestamp + 8 days
            });

            bytes32 salt = keccak256(abi.encodePacked("test", i));
            address poolAddress = factory.createPool(config, salt);

            assertTrue(factory.poolExists(poolAddress));
            assertEq(factory.allPools(i), poolAddress);
        }

        assertEq(factory.allPoolsLength(), 3);
    }

    function testViewFunctions() public {
        // Test allPoolsLength starts at 0
        assertEq(factory.allPoolsLength(), 0);

        // Create a pool
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: user1,
            tokenName: "Test Token",
            tokenSymbol: "TEST",
            fundingToken: address(fundingToken),
            tokenTotalSupply: 1000000e18,
            developmentFund: 500000e18,
            liquidityFund: 500000e18,
            developerPercent: 50,
            treasuryPercent: 30,
            daoPercent: 20,
            startTime: block.timestamp + 1 hours,
            endTime: block.timestamp + 8 days
        });

        bytes32 salt = keccak256(abi.encodePacked("test"));
        address poolAddress = factory.createPool(config, salt);

        // Test view functions after pool creation
        assertEq(factory.allPoolsLength(), 1);
        assertEq(factory.allPools(0), poolAddress);
        assertTrue(factory.poolExists(poolAddress));
        assertFalse(factory.poolExists(address(0x9999)));
    }

    function testOwnershipFunctionality() public {
        // Test that only owner can call owner-only functions (if any exist in future)
        assertEq(factory.owner(), owner);

        // Factory currently doesn't have owner-only functions beyond constructor,
        // but this test structure is ready if we add any
    }

    function testSSTORE2Integration() public {
        // Test that SSTORE2 pointer is properly set
        address pointer = factory.poolBytecodePointer();
        assertTrue(pointer != address(0));

        // Test that we can create pools (which uses SSTORE2.read internally)
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: user1,
            tokenName: "SSTORE2 Test",
            tokenSymbol: "S2T",
            fundingToken: address(fundingToken),
            tokenTotalSupply: 1000000e18,
            developmentFund: 500000e18,
            liquidityFund: 500000e18,
            developerPercent: 50,
            treasuryPercent: 30,
            daoPercent: 20,
            startTime: block.timestamp + 1 hours,
            endTime: block.timestamp + 8 days
        });

        bytes32 salt = keccak256(abi.encodePacked("sstore2test"));
        address poolAddress = factory.createPool(config, salt);

        // Verify pool was created successfully using SSTORE2
        assertTrue(poolAddress != address(0));
        assertTrue(factory.poolExists(poolAddress));
    }

    function testConfigEdgeCases() public {
        // Test maximum valid values
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: user1,
            tokenName: "Max Test Token",
            tokenSymbol: "MAX",
            fundingToken: address(fundingToken),
            tokenTotalSupply: type(uint256).max,
            developmentFund: type(uint256).max / 2,
            liquidityFund: type(uint256).max / 2,
            developerPercent: 100,
            treasuryPercent: 0,
            daoPercent: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + 30 days
        });

        bytes32 salt = keccak256(abi.encodePacked("maxtest"));
        address poolAddress = factory.createPool(config, salt);
        assertTrue(poolAddress != address(0));

        // Test minimum valid time range
        config.tokenName = "Min Test Token";
        config.tokenSymbol = "MIN";
        config.tokenTotalSupply = 1;
        config.developmentFund = 1;
        config.liquidityFund = 1;
        config.startTime = block.timestamp;
        config.endTime = block.timestamp + 1;

        salt = keccak256(abi.encodePacked("mintest"));
        poolAddress = factory.createPool(config, salt);
        assertTrue(poolAddress != address(0));
    }
}
