// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

/// @title ProlendVault
/// @notice A simplified vault accounting library inspired by Fraxlend's VaultAccount
/// @dev Uses uint128 to save on storage, provides share-based accounting for lending protocols
struct VaultAccount {
    uint128 amount; // Total amount, analogous to market cap
    uint128 shares; // Total shares, analogous to shares outstanding
}

/// @title ProlendVault Library
/// @author Prorated Protocol, inspired by Frax Finance VaultAccount
/// @notice Provides a library for use with the VaultAccount struct, provides convenient math implementations
/// @dev Uses uint128 to save on storage, supports both rounding up and down
library ProlendVault {
    /// @notice Calculates the shares value in relationship to `amount` and `total`
    /// @dev Given an amount, return the appropriate number of shares
    /// @param total The total vault account struct containing amount and shares
    /// @param amount The amount to convert to shares
    /// @param roundUp Whether to round up the result for conservative accounting
    /// @return shares The number of shares corresponding to the amount
    function toShares(
        VaultAccount memory total,
        uint256 amount,
        bool roundUp
    ) internal pure returns (uint256 shares) {
        if (total.amount == 0) {
            shares = amount;
        } else {
            shares = (amount * total.shares) / total.amount;
            if (roundUp && (shares * total.amount) / total.shares < amount) {
                shares = shares + 1;
            }
        }
    }

    /// @notice Calculates the amount value in relationship to `shares` and `total`
    /// @dev Given a number of shares, returns the appropriate amount
    /// @param total The total vault account struct containing amount and shares
    /// @param shares The number of shares to convert to amount
    /// @param roundUp Whether to round up the result for conservative accounting
    /// @return amount The amount corresponding to the shares
    function toAmount(
        VaultAccount memory total,
        uint256 shares,
        bool roundUp
    ) internal pure returns (uint256 amount) {
        if (total.shares == 0) {
            amount = shares;
        } else {
            amount = (shares * total.amount) / total.shares;
            if (roundUp && (amount * total.shares) / total.amount < shares) {
                amount = amount + 1;
            }
        }
    }

    /// @notice Adds shares and amount to the vault account
    /// @dev Updates the vault account in place
    /// @param total The vault account to update
    /// @param shares The number of shares to add
    /// @param amount The amount to add
    function addToVault(
        VaultAccount storage total,
        uint256 shares,
        uint256 amount
    ) internal {
        total.shares += uint128(shares);
        total.amount += uint128(amount);
    }

    /// @notice Removes shares and amount from the vault account
    /// @dev Updates the vault account in place
    /// @param total The vault account to update
    /// @param shares The number of shares to remove
    /// @param amount The amount to remove
    function removeFromVault(
        VaultAccount storage total,
        uint256 shares,
        uint256 amount
    ) internal {
        total.shares -= uint128(shares);
        total.amount -= uint128(amount);
    }

    /// @notice Gets the exchange rate between shares and amount
    /// @dev Returns the amount per share, scaled by 1e18
    /// @param total The vault account to calculate rate for
    /// @return rate The exchange rate (amount per share) scaled by 1e18
    function getExchangeRate(
        VaultAccount memory total
    ) internal pure returns (uint256 rate) {
        if (total.shares == 0) {
            rate = 1e18;
        } else {
            rate = (uint256(total.amount) * 1e18) / uint256(total.shares);
        }
    }

    /// @notice Checks if the vault account is empty
    /// @param total The vault account to check
    /// @return True if both amount and shares are zero
    function isEmpty(VaultAccount memory total) internal pure returns (bool) {
        return total.amount == 0 && total.shares == 0;
    }
}
