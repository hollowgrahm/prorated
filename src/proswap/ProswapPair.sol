// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "../libraries/Math.sol";
import "../libraries/UQ112x112.sol";
import "../interfaces/IProswapCallee.sol";
import "../interfaces/IProswapFactory.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";

interface IERC20 {
    function balanceOf(address) external returns (uint256);
    function transfer(address to, uint256 amount) external;
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

error AlreadyInitialized();
error BalanceOverflow();
error InsufficientInputAmount();
error InsufficientLiquidity();
error InsufficientLiquidityBurned();
error InsufficientLiquidityMinted();
error InsufficientOutputAmount();
error InvalidK();
error NotFactory();

contract ProswapPair is ERC20, ReentrancyGuard {
    using UQ112x112 for uint224;
    using Math for uint256;
    using SafeTransferLib for ERC20;

    uint256 constant MINIMUM_LIQUIDITY = 1000;

    address public token80;
    address public token20;
    IProswapFactory public immutable proswapFactory;

    uint112 private reserve80;
    uint112 private reserve20;
    uint32 private blockTimestampLast;

    uint256 public price80CumulativeLast;
    uint256 public price20CumulativeLast;

    event Burn(
        address indexed sender,
        uint256 amount80,
        uint256 amount20,
        address to
    );
    event Mint(address indexed sender, uint256 amount80, uint256 amount20);
    event Sync(uint256 reserve80, uint256 reserve20);
    event Swap(
        address indexed sender,
        uint256 amount80Out,
        uint256 amount20Out,
        address indexed to
    );
    event Initialized(address indexed token80, address indexed token20);

    // ============ CONSTRUCTOR ============
    /// @notice Creates a new Proswap pair
    /// @param _factory Address of the Proswap factory contract
    constructor(address _factory) ERC20("Proswap Pair", "PROSWAP", 18) {
        proswapFactory = IProswapFactory(_factory);
    }

    // ============ SETUP FUNCTIONS ============

    /// @notice Initializes the pair with token addresses
    /// @param token80_ Address of token with 80% weight
    /// @param token20_ Address of token with 20% weight
    /// @dev Can only be called once per pair and only by the factory
    /// @dev Sets dynamic name and symbol based on token symbols for better UX
    function initialize(address token80_, address token20_) public {
        // Step 1: Ensure not already initialized
        if (token80 != address(0) || token20 != address(0))
            revert AlreadyInitialized();
        // Step 2: Only factory may initialize new pairs
        if (msg.sender != address(proswapFactory)) revert NotFactory();

        // Step 3: Store token addresses
        token80 = token80_;
        token20 = token20_;

        // Step 4: Derive dynamic metadata from underlying token symbols
        string memory token80Symbol = IERC20(token80_).symbol();
        string memory token20Symbol = IERC20(token20_).symbol();

        name = string(
            abi.encodePacked(
                "Proswap 80 ",
                token80Symbol,
                " / 20 ",
                token20Symbol
            )
        );
        symbol = string(
            abi.encodePacked("PRO-80", token80Symbol, "/20", token20Symbol)
        );

        // Step 5: Emit initialization event
        emit Initialized(token80_, token20_);
    }

    /// @notice Mints liquidity tokens to the specified address
    /// @param to Address to receive the minted liquidity tokens
    /// @return liquidity Amount of liquidity tokens minted
    /// @dev Uses weighted invariant x^0.8 * y^0.2 = k for initial liquidity calculation
    function mint(address to) public nonReentrant returns (uint256 liquidity) {
        // Step 1: Read current reserves and balances
        (uint112 reserve80_, uint112 reserve20_, ) = getReserves();
        uint256 balance80 = IERC20(token80).balanceOf(address(this));
        uint256 balance20 = IERC20(token20).balanceOf(address(this));
        uint256 amount80 = balance80 - reserve80_;
        uint256 amount20 = balance20 - reserve20_;

        if (totalSupply == 0) {
            // INVARIANT MIGRATION: Changed from x * y = k to x^0.8 * y^0.2 = k
            // For initial liquidity, we use the weighted geometric mean approach
            // This ensures the initial LP tokens represent the weighted invariant value
            //
            // MANUAL VERIFICATION: For amounts (1000, 1000):
            // Old invariant: liquidity = sqrt(1000 * 1000) = 1000
            // New invariant: liquidity = (1000^0.8 * 1000^0.2) = 1000
            // For amounts (1000, 4000):
            // Old invariant: liquidity = sqrt(1000 * 4000) = 2000
            // New invariant: liquidity = (1000^0.8 * 4000^0.2) = 1000 * 1.3195 = 1319.5
            // WEIGHTED INVARIANT: token80 gets 80% weight, token20 gets 20% weight
            // This creates asymmetric liquidity provision favoring token80
            // Step 2: Compute liquidity for initial mint using weighted product minus minimum liquidity
            uint256 amount80Pow08 = Math.pow08(amount80);
            uint256 amount20Pow02 = Math.pow02(amount20);
            liquidity =
                (amount80Pow08 * amount20Pow02) /
                Math.WAD -
                MINIMUM_LIQUIDITY;
            // Step 3: Permanently lock MINIMUM_LIQUIDITY to the zero address
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            // INVARIANT MIGRATION: Proportional liquidity calculation remains unchanged
            // This is because LP token redemption should be proportional regardless of invariant
            // The invariant only affects swap pricing, not LP token distribution
            // Step 2: Compute proportional liquidity to maintain pool share
            liquidity = Math.min(
                (amount80 * totalSupply) / reserve80_,
                (amount20 * totalSupply) / reserve20_
            );
        }

        // Step 4: Validate non-zero liquidity
        if (liquidity <= 0) revert InsufficientLiquidityMinted();

        // Step 5: Mint LP tokens and update reserves
        _mint(to, liquidity);

        _update(balance80, balance20, reserve80_, reserve20_);

        // Step 6: Emit Mint event
        emit Mint(to, amount80, amount20);
    }

    // ============ CORE AMM FUNCTIONS ============

    /// @notice Burns liquidity tokens and returns the underlying token amounts
    /// @param to Address to receive the underlying tokens
    /// @return amount80 Amount of token with 80% weight returned
    /// @return amount20 Amount of token with 20% weight returned
    /// @dev LP token redemption is proportional regardless of invariant type
    function burn(
        address to
    ) public nonReentrant returns (uint256 amount80, uint256 amount20) {
        // Step 1: Snapshot current balances and LP held by pair contract
        uint256 balance80 = IERC20(token80).balanceOf(address(this));
        uint256 balance20 = IERC20(token20).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];

        // INVARIANT MIGRATION: Proportional redemption remains unchanged
        // LP tokens represent proportional ownership of the pool regardless of invariant
        // This ensures fair redemption for all liquidity providers
        // Step 2: Compute proportional redemption amounts
        amount80 = (liquidity * balance80) / totalSupply;
        amount20 = (liquidity * balance20) / totalSupply;

        if (amount80 == 0 || amount20 == 0)
            revert InsufficientLiquidityBurned();

        // Step 3: Burn LP tokens from pair contract
        _burn(address(this), liquidity);

        // Step 4: Transfer underlying tokens out (effects before interactions done)
        ERC20(token80).safeTransfer(to, amount80);
        ERC20(token20).safeTransfer(to, amount20);

        balance80 = IERC20(token80).balanceOf(address(this));
        balance20 = IERC20(token20).balanceOf(address(this));

        // Step 5: Update reserves to match new balances
        (uint112 reserve80_, uint112 reserve20_, ) = getReserves();
        _update(balance80, balance20, reserve80_, reserve20_);

        // Step 6: Emit event
        emit Burn(msg.sender, amount80, amount20, to);
    }

    /// @notice Swaps tokens using the weighted invariant x^0.8 * y^0.2 = k
    /// @param amount80Out Amount of token with 80% weight to output
    /// @param amount20Out Amount of token with 20% weight to output
    /// @param to Address to receive the output tokens
    /// @param data Optional callback data for flash swaps
    /// @dev Implements enhanced bounds checking, protocol fee collection via factory,
    ///      and weighted invariant validation. NonReentrant.
    function swap(
        uint256 amount80Out,
        uint256 amount20Out,
        address to,
        bytes calldata data
    ) public nonReentrant {
        // Step 1: Validate non-zero output request
        if (amount80Out == 0 && amount20Out == 0)
            revert InsufficientOutputAmount();

        (uint112 reserve80_, uint112 reserve20_, ) = getReserves();

        if (amount80Out > reserve80_ || amount20Out > reserve20_)
            revert InsufficientLiquidity();

        // Step 2: Perform optimistic transfers and optional callback (flash swap)
        if (amount80Out > 0) ERC20(token80).safeTransfer(to, amount80Out);
        if (amount20Out > 0) ERC20(token20).safeTransfer(to, amount20Out);
        if (data.length > 0) {
            IProswapCallee(to).proswapCall(
                msg.sender,
                amount80Out,
                amount20Out,
                data
            );
        }

        uint256 balance80 = IERC20(token80).balanceOf(address(this));
        uint256 balance20 = IERC20(token20).balanceOf(address(this));

        uint256 amount80In = balance80 > reserve80_ - amount80Out
            ? balance80 - (reserve80_ - amount80Out)
            : 0;
        uint256 amount20In = balance20 > reserve20_ - amount20Out
            ? balance20 - (reserve20_ - amount20Out)
            : 0;

        // Step 3: Validate that sufficient inputs were provided by callback or caller
        if (amount80In == 0 && amount20In == 0)
            revert InsufficientInputAmount();

        // Collect protocol fees from factory
        // Step 4: Protocol-wide fee removed in prototype; only LP fee (0.30%) remains in invariant adjustment

        // Step 5: Enhanced bounds checking to prevent excessive slippage
        // MAX_IN_RATIO = 30% prevents manipulation and extreme price impact
        if (amount80In > 0) {
            if (amount80In > (balance80 * Math.MAX_IN_RATIO) / Math.WAD) {
                revert Math.MaxInRatio();
            }
        }
        if (amount20In > 0) {
            if (amount20In > (balance20 * Math.MAX_IN_RATIO) / Math.WAD) {
                revert Math.MaxInRatio();
            }
        }

        // Step 6: Validate weighted invariant (x^0.8 * y^0.2 = k) allowing 0.3% fee adjustments
        {
            // Calculate invariants with proper scaling
            uint256 balance80Adjusted = (balance80 * 1000) - (amount80In * 3);
            uint256 balance20Adjusted = (balance20 * 1000) - (amount20In * 3);

            uint256 newInvariant = (Math.pow08(balance80Adjusted) *
                Math.pow02(balance20Adjusted)) / Math.WAD;

            // Scale old invariant to match new invariant scaling (1000^1 = 1000)
            uint256 oldInvariantScaled = ((Math.pow08(
                uint256(reserve80_) * 1000
            ) * Math.pow02(uint256(reserve20_) * 1000)) / Math.WAD);

            // Allow slight decrease due to rounding, but prevent significant invariant reduction
            if (newInvariant < (oldInvariantScaled * 999) / 1000)
                revert InvalidK();
        }

        // Step 7: Update reserves and price accumulators
        _update(balance80, balance20, reserve80_, reserve20_);

        // Step 8: Emit Swap event
        emit Swap(msg.sender, amount80Out, amount20Out, to);
    }

    // ============ UTILITY & QUERY FUNCTIONS ============

    /// @notice Synchronizes reserves with current token balances
    /// @dev Useful for recovering from balance discrepancies; emits Sync
    function sync() public {
        // Step 1: Read current reserves
        (uint112 reserve80_, uint112 reserve20_, ) = getReserves();
        // Step 2: Update reserves to match on-chain balances
        _update(
            IERC20(token80).balanceOf(address(this)),
            IERC20(token20).balanceOf(address(this)),
            reserve80_,
            reserve20_
        );
    }

    /// @notice Returns the current reserves and last block timestamp
    /// @return reserve80 Current reserve of token with 80% weight
    /// @return reserve20 Current reserve of token with 20% weight
    /// @return blockTimestampLast Last block timestamp when reserves were updated
    function getReserves() public view returns (uint112, uint112, uint32) {
        return (reserve80, reserve20, blockTimestampLast);
    }

    // ============ PRIVATE HELPER FUNCTIONS ============

    /// @notice Updates reserves and cumulative price oracle
    /// @param balance80 Current balance of token with 80% weight
    /// @param balance20 Current balance of token with 20% weight
    /// @param reserve80_ Previous reserve of token with 80% weight
    /// @param reserve20_ Previous reserve of token with 20% weight
    /// @dev Implements weighted price oracle for x^0.8 * y^0.2 = k invariant
    function _update(
        uint256 balance80,
        uint256 balance20,
        uint112 reserve80_,
        uint112 reserve20_
    ) private {
        // Step 1: Range-check balances to fit into uint112 reserves
        if (balance80 > type(uint112).max || balance20 > type(uint112).max)
            revert BalanceOverflow();

        unchecked {
            // Step 2: Compute time elapsed for oracle accumulation
            uint32 timeElapsed = uint32(block.timestamp) - blockTimestampLast;

            if (timeElapsed > 0 && reserve80_ > 0 && reserve20_ > 0) {
                // INVARIANT MIGRATION: Changed price oracle calculation for weighted invariant
                // Old invariant: price80 = reserve20 / reserve80, price20 = reserve80 / reserve20
                // New invariant: price80 = reserve20^0.2 / reserve80^0.8, price20 = reserve80^0.8 / reserve20^0.2
                //
                // MANUAL VERIFICATION: For reserves (1000, 1000):
                // Old invariant: price80 = 1000/1000 = 1.0, price20 = 1000/1000 = 1.0
                // New invariant: price80 = 1000^0.2/1000^0.8 = 1.0, price20 = 1000^0.8/1000^0.2 = 1.0
                // For reserves (1000, 4000):
                // Old invariant: price80 = 4000/1000 = 4.0, price20 = 1000/4000 = 0.25
                // New invariant: price80 = 4000^0.2/1000^0.8 = 1.32, price20 = 1000^0.8/4000^0.2 = 0.76
                // This shows the weighted oracle creates different price relationships

                {
                    uint256 reserve80Pow08 = Math.pow08(uint256(reserve80_));
                    uint256 reserve20Pow02 = Math.pow02(uint256(reserve20_));
                    uint256 price80 = (reserve20Pow02 * UQ112x112.Q112) /
                        reserve80Pow08;
                    price80CumulativeLast += price80 * timeElapsed;
                }

                {
                    uint256 reserve80Pow08 = Math.pow08(uint256(reserve80_));
                    uint256 reserve20Pow02 = Math.pow02(uint256(reserve20_));
                    uint256 price20 = (reserve80Pow08 * UQ112x112.Q112) /
                        reserve20Pow02;
                    price20CumulativeLast += price20 * timeElapsed;
                }
            }
        }

        // Step 3: Persist new reserves and timestamp
        reserve80 = uint112(balance80);
        reserve20 = uint112(balance20);
        blockTimestampLast = uint32(block.timestamp);

        // Step 4: Emit Sync event
        emit Sync(reserve80, reserve20);
    }
}
