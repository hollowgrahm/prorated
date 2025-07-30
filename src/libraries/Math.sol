// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/**
 * @dev Math library with Balancer's LogExpMath functionality for safe exponentiation.
 * Includes essential parts of Balancer's LogExpMath for fractional exponents.
 */
library Math {
    // Fixed-point arithmetic constants
    uint256 internal constant RAY = 1e27;
    uint256 internal constant WAD = 1e18;

    // LogExpMath constants (from Balancer)
    int256 internal constant ONE_18 = 1e18;
    int256 internal constant ONE_20 = 1e20;
    int256 internal constant ONE_36 = 1e36;
    int256 internal constant MAX_NATURAL_EXPONENT = 130e18;
    int256 internal constant MIN_NATURAL_EXPONENT = -41e18;
    int256 internal constant LN_36_LOWER_BOUND = ONE_18 - 1e17;
    int256 internal constant LN_36_UPPER_BOUND = ONE_18 + 1e17;
    uint256 internal constant MILD_EXPONENT_BOUND = 2 ** 254 / uint256(ONE_20);

    // Precomputed constants for exp and ln
    int256 internal constant x0 = 128000000000000000000; // 2^7
    int256 internal constant a0 =
        38877084059945950922200000000000000000000000000000000000; // e^(x0)
    int256 internal constant x1 = 64000000000000000000; // 2^6
    int256 internal constant a1 = 6235149080811616882910000000; // e^(x1)
    int256 internal constant x2 = 3200000000000000000000; // 2^5
    int256 internal constant a2 = 7896296018268069516100000000000000; // e^(x2)
    int256 internal constant x3 = 1600000000000000000000; // 2^4
    int256 internal constant a3 = 888611052050787263676000000; // e^(x3)
    int256 internal constant x4 = 800000000000000000000; // 2^3
    int256 internal constant a4 = 298095798704172827474000; // e^(x4)
    int256 internal constant x5 = 400000000000000000000; // 2^2
    int256 internal constant a5 = 5459815003314423907810; // e^(x5)
    int256 internal constant x6 = 200000000000000000000; // 2^1
    int256 internal constant a6 = 738905609893065022723; // e^(x6)
    int256 internal constant x7 = 100000000000000000000; // 2^0
    int256 internal constant a7 = 271828182845904523536; // e^(x7)
    int256 internal constant x8 = 50000000000000000000; // 2^-1
    int256 internal constant a8 = 164872127070012814685; // e^(x8)
    int256 internal constant x9 = 25000000000000000000; // 2^-2
    int256 internal constant a9 = 128402541668774148407; // e^(x9)
    int256 internal constant x10 = 12500000000000000000; // 2^-3
    int256 internal constant a10 = 113314845306682631683; // e^(x10)
    int256 internal constant x11 = 6250000000000000000; // 2^-4
    int256 internal constant a11 = 106449445891785942956; // e^(x11)

    // SECURITY: Sophisticated bounds checking constants (inspired by Balancer)
    // These limits prevent manipulation and excessive slippage
    // Swap limits: amounts swapped may not be larger than this percentage of the total balance
    uint256 internal constant MAX_IN_RATIO = 30e16; // 30%
    uint256 internal constant MAX_OUT_RATIO = 30e16; // 30%

    // Invariant growth/shrink limits for liquidity operations
    // Prevents dramatic changes to pool characteristics through large liquidity operations
    uint256 internal constant MAX_INVARIANT_RATIO = 300e16; // 300% (3x)
    uint256 internal constant MIN_INVARIANT_RATIO = 70e16; // 70% (0.7x)

    // Custom errors for better gas efficiency
    error MaxInRatio();
    error MaxOutRatio();
    error InvariantRatioAboveMax(
        uint256 invariantRatio,
        uint256 maxInvariantRatio
    );
    error InvariantRatioBelowMin(
        uint256 invariantRatio,
        uint256 minInvariantRatio
    );

    /// @notice Returns the minimum of two numbers
    /// @param a First number
    /// @param b Second number
    /// @return The smaller of the two numbers
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /// @notice Calculates x^0.8 using LogExpMath for weighted invariant
    /// @param x Base value
    /// @return x raised to the power of 0.8
    /// @dev Uses integrated LogExpMath for safe fractional exponentiation
    function pow08(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        if (x == 1) return 1;

        // INVARIANT MIGRATION: Implements x^0.8 for weighted invariant
        // Uses LogExpMath for safe fractional exponentiation
        // 0.8 * WAD represents 0.8 in fixed-point arithmetic
        return pow(x, (8 * WAD) / 10);
    }

    /// @notice Calculates x^0.2 using LogExpMath for weighted invariant
    /// @param x Base value
    /// @return x raised to the power of 0.2
    /// @dev Uses integrated LogExpMath for safe fractional exponentiation
    function pow02(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        if (x == 1) return 1;

        // INVARIANT MIGRATION: Implements x^0.2 for weighted invariant
        // Uses LogExpMath for safe fractional exponentiation
        // 0.2 * WAD represents 0.2 in fixed-point arithmetic
        return pow(x, (2 * WAD) / 10);
    }

    /// @notice Ensures invariant ratio is below maximum bound
    /// @param invariantRatio Current invariant ratio to check
    /// @dev Reverts if invariant ratio exceeds MAX_INVARIANT_RATIO (300%)
    function ensureInvariantRatioBelowMaximumBound(
        uint256 invariantRatio
    ) internal pure {
        if (invariantRatio > MAX_INVARIANT_RATIO) {
            revert InvariantRatioAboveMax(invariantRatio, MAX_INVARIANT_RATIO);
        }
    }

    /// @notice Ensures invariant ratio is above minimum bound
    /// @param invariantRatio Current invariant ratio to check
    /// @dev Reverts if invariant ratio is below MIN_INVARIANT_RATIO (70%)
    function ensureInvariantRatioAboveMinimumBound(
        uint256 invariantRatio
    ) internal pure {
        if (invariantRatio < MIN_INVARIANT_RATIO) {
            revert InvariantRatioBelowMin(invariantRatio, MIN_INVARIANT_RATIO);
        }
    }

    /// @notice Calculates output amount for exact input using Balancer's WeightedMath
    /// @param balanceIn Current balance of input token
    /// @param weightIn Weight of input token (e.g., 0.8 for 80%)
    /// @param balanceOut Current balance of output token
    /// @param weightOut Weight of output token (e.g., 0.2 for 20%)
    /// @param amountIn Amount of input token
    /// @return amountOut Calculated output amount
    /// @dev Implements Balancer's WeightedMath formula with bounds checking
    function computeOutGivenExactIn(
        uint256 balanceIn,
        uint256 weightIn,
        uint256 balanceOut,
        uint256 weightOut,
        uint256 amountIn
    ) internal pure returns (uint256 amountOut) {
        // SECURITY: Bounds checking prevents excessive slippage and manipulation
        if (amountIn > (balanceIn * MAX_IN_RATIO) / WAD) {
            revert MaxInRatio();
        }

        // INVARIANT MIGRATION: Implements Balancer's WeightedMath formula
        // Formula: amountOut = balanceOut * (1 - (balanceIn / (balanceIn + amountIn))^(weightIn / weightOut))
        //
        // MANUAL VERIFICATION: For balances (1000, 1000), weights (0.8, 0.2), input 100:
        // base = 1000 / 1100 = 0.909
        // exponent = 0.8 / 0.2 = 4
        // power = 0.909^4 = 0.683
        // complement = 1 - 0.683 = 0.317
        // amountOut = 1000 * 0.317 = 317
        // This shows the weighted invariant creates different price curves than constant product

        uint256 denominator = balanceIn + amountIn;
        uint256 base = (balanceIn * WAD) / denominator;
        uint256 exponent = (weightIn * WAD) / weightOut;
        uint256 power = pow(base, exponent);

        // Use complement to avoid negative values
        uint256 complement = power > WAD ? 0 : WAD - power;

        return (balanceOut * complement) / WAD;
    }

    /// @notice Calculates input amount for exact output using Balancer's WeightedMath
    /// @param balanceIn Current balance of input token
    /// @param weightIn Weight of input token (e.g., 0.8 for 80%)
    /// @param balanceOut Current balance of output token
    /// @param weightOut Weight of output token (e.g., 0.2 for 20%)
    /// @param amountOut Desired output amount
    /// @return amountIn Calculated input amount
    /// @dev Implements Balancer's WeightedMath formula with bounds checking
    function computeInGivenExactOut(
        uint256 balanceIn,
        uint256 weightIn,
        uint256 balanceOut,
        uint256 weightOut,
        uint256 amountOut
    ) internal pure returns (uint256 amountIn) {
        // SECURITY: Bounds checking prevents excessive slippage and manipulation
        if (amountOut > (balanceOut * MAX_OUT_RATIO) / WAD) {
            revert MaxOutRatio();
        }

        // INVARIANT MIGRATION: Implements Balancer's WeightedMath formula
        // Formula: amountIn = balanceIn * (((balanceOut / (balanceOut - amountOut))^(weightOut / weightIn)) - 1)
        //
        // MANUAL VERIFICATION: For balances (1000, 1000), weights (0.8, 0.2), output 100:
        // base = 1000 / 900 = 1.111
        // exponent = 0.2 / 0.8 = 0.25
        // power = 1.111^0.25 = 1.027
        // ratio = 1.027 - 1 = 0.027
        // amountIn = 1000 * 0.027 = 27
        // This shows the weighted invariant creates different price curves than constant product

        uint256 base = (balanceOut * WAD) / (balanceOut - amountOut);
        uint256 exponent = (weightOut * WAD) / weightIn;
        uint256 power = pow(base, exponent);

        uint256 ratio = power - WAD;

        return (balanceIn * ratio) / WAD;
    }

    /// @notice Calculates x^y using LogExpMath for safe exponentiation
    /// @param x Base value
    /// @param y Exponent value (in WAD format)
    /// @return x raised to the power of y
    /// @dev Uses LogExpMath for safe fractional and integer exponentiation
    function pow(uint256 x, uint256 y) internal pure returns (uint256) {
        if (y == 0) {
            return uint256(ONE_18);
        }

        if (x == 0) {
            return 0;
        }

        // Check bounds
        if (x >> 255 != 0) {
            revert("BaseOutOfBounds");
        }
        int256 x_int256 = int256(x);

        if (y >= MILD_EXPONENT_BOUND) {
            revert("ExponentOutOfBounds");
        }
        int256 y_int256 = int256(y);

        int256 logx_times_y;
        unchecked {
            if (LN_36_LOWER_BOUND < x_int256 && x_int256 < LN_36_UPPER_BOUND) {
                int256 ln_36_x = _ln_36(x_int256);
                logx_times_y = ((ln_36_x / ONE_18) *
                    y_int256 +
                    ((ln_36_x % ONE_18) * y_int256) /
                    ONE_18);
            } else {
                logx_times_y = _ln(x_int256) * y_int256;
            }
            logx_times_y /= ONE_18;
        }

        if (
            !(MIN_NATURAL_EXPONENT <= logx_times_y &&
                logx_times_y <= MAX_NATURAL_EXPONENT)
        ) {
            revert("ProductOutOfBounds");
        }

        return uint256(exp(logx_times_y));
    }

    /// @notice Calculates e^x using LogExpMath
    /// @param x Exponent value
    /// @return e raised to the power of x
    /// @dev Uses LogExpMath for safe exponential calculation
    function exp(int256 x) internal pure returns (int256) {
        if (!(x >= MIN_NATURAL_EXPONENT && x <= MAX_NATURAL_EXPONENT)) {
            revert("InvalidExponent");
        }

        bool negativeExponent = false;

        if (x < 0) {
            unchecked {
                x = -x;
            }
            negativeExponent = true;
        }

        int256 firstAN;
        unchecked {
            if (x >= x0) {
                x -= x0;
                firstAN = a0;
            } else if (x >= x1) {
                x -= x1;
                firstAN = a1;
            } else {
                firstAN = 1;
            }

            x *= 100;
        }

        int256 product = ONE_20;

        unchecked {
            if (x >= x2) {
                x -= x2;
                product = (product * a2) / ONE_20;
            }
            if (x >= x3) {
                x -= x3;
                product = (product * a3) / ONE_20;
            }
            if (x >= x4) {
                x -= x4;
                product = (product * a4) / ONE_20;
            }
            if (x >= x5) {
                x -= x5;
                product = (product * a5) / ONE_20;
            }
            if (x >= x6) {
                x -= x6;
                product = (product * a6) / ONE_20;
            }
            if (x >= x7) {
                x -= x7;
                product = (product * a7) / ONE_20;
            }
            if (x >= x8) {
                x -= x8;
                product = (product * a8) / ONE_20;
            }
            if (x >= x9) {
                x -= x9;
                product = (product * a9) / ONE_20;
            }
        }

        int256 seriesSum = ONE_20;
        int256 term = x;

        unchecked {
            seriesSum += term;

            term = ((term * x) / ONE_20) / 2;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 3;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 4;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 5;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 6;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 7;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 8;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 9;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 10;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 11;
            seriesSum += term;

            term = ((term * x) / ONE_20) / 12;
            seriesSum += term;

            int256 result = (((product * seriesSum) / ONE_20) * firstAN) / 100;

            return negativeExponent ? (ONE_18 * ONE_18) / result : result;
        }
    }

    /// @notice Calculates natural logarithm using LogExpMath
    /// @param a Number to calculate ln of
    /// @return Natural logarithm of the input
    /// @dev Uses LogExpMath for safe logarithmic calculation
    function _ln(int256 a) private pure returns (int256) {
        bool negativeExponent = false;

        if (a < ONE_18) {
            unchecked {
                a = (ONE_18 * ONE_18) / a;
            }
            negativeExponent = true;
        }

        int256 sum = 0;
        unchecked {
            if (a >= a0 * ONE_18) {
                a /= a0;
                sum += x0;
            }

            if (a >= a1 * ONE_18) {
                a /= a1;
                sum += x1;
            }

            sum *= 100;
            a *= 100;

            if (a >= a2) {
                a = (a * ONE_20) / a2;
                sum += x2;
            }

            if (a >= a3) {
                a = (a * ONE_20) / a3;
                sum += x3;
            }

            if (a >= a4) {
                a = (a * ONE_20) / a4;
                sum += x4;
            }

            if (a >= a5) {
                a = (a * ONE_20) / a5;
                sum += x5;
            }

            if (a >= a6) {
                a = (a * ONE_20) / a6;
                sum += x6;
            }

            if (a >= a7) {
                a = (a * ONE_20) / a7;
                sum += x7;
            }

            if (a >= a8) {
                a = (a * ONE_20) / a8;
                sum += x8;
            }

            if (a >= a9) {
                a = (a * ONE_20) / a9;
                sum += x9;
            }

            if (a >= a10) {
                a = (a * ONE_20) / a10;
                sum += x10;
            }

            if (a >= a11) {
                a = (a * ONE_20) / a11;
                sum += x11;
            }
        }

        unchecked {
            int256 z = ((a - ONE_20) * ONE_20) / (a + ONE_20);
            int256 z_squared = (z * z) / ONE_20;

            int256 num = z;
            int256 seriesSum = num;

            num = (num * z_squared) / ONE_20;
            seriesSum += num / 3;

            num = (num * z_squared) / ONE_20;
            seriesSum += num / 5;

            num = (num * z_squared) / ONE_20;
            seriesSum += num / 7;

            num = (num * z_squared) / ONE_20;
            seriesSum += num / 9;

            num = (num * z_squared) / ONE_20;
            seriesSum += num / 11;

            seriesSum *= 2;

            int256 result = (sum + seriesSum) / 100;

            return negativeExponent ? -result : result;
        }
    }

    /// @notice Calculates natural logarithm with 36 decimal precision
    /// @param x Number to calculate ln of
    /// @return Natural logarithm with 36 decimal precision
    /// @dev Uses LogExpMath for high-precision logarithmic calculation
    function _ln_36(int256 x) private pure returns (int256) {
        unchecked {
            x *= ONE_18;

            int256 z = ((x - ONE_36) * ONE_36) / (x + ONE_36);
            int256 z_squared = (z * z) / ONE_36;

            int256 num = z;
            int256 seriesSum = num;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 3;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 5;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 7;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 9;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 11;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 13;

            num = (num * z_squared) / ONE_36;
            seriesSum += num / 15;

            return seriesSum * 2;
        }
    }

    /// @notice Computes the weighted invariant for x^0.8 * y^0.2 = k
    /// @param balance0 Balance of token0
    /// @param balance1 Balance of token1
    /// @return invariant The weighted invariant value
    /// @dev Used for liquidity operations and invariant ratio checking
    function computeInvariant(
        uint256 balance0,
        uint256 balance1
    ) internal pure returns (uint256 invariant) {
        // INVARIANT MIGRATION: Implements weighted invariant x^0.8 * y^0.2 = k
        // Old invariant: invariant = balance0 * balance1
        // New invariant: invariant = balance0^0.8 * balance1^0.2
        //
        // MANUAL VERIFICATION: For balances (1000, 1000):
        // Old invariant: 1000 * 1000 = 1,000,000
        // New invariant: 1000^0.8 * 1000^0.2 = 1000^1 = 1,000,000
        // For balances (1000, 4000):
        // Old invariant: 1000 * 4000 = 4,000,000
        // New invariant: 1000^0.8 * 4000^0.2 = 1000 * 1.3195 = 1,319,500
        // This shows the weighted invariant creates different pool characteristics
        uint256 balance0Pow08 = pow08(balance0);
        uint256 balance1Pow02 = pow02(balance1);
        invariant = (balance0Pow08 * balance1Pow02) / WAD;
    }
}
