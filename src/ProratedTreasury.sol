// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {IProratedVENFT} from "./interfaces/IProratedVENFT.sol";
import {IProratedGovernor} from "./interfaces/IProratedGovernor.sol";

contract ProratedTreasury is Owned, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    error Unauthorized();
    error InsufficientBalance();
    error InvalidAmount();
    error NoVeNFTPosition();

    event TreasuryFundsDistributed(
        address indexed recipient,
        uint256 amount,
        string reason
    );
    event TreasuryVeNFTCreated(
        uint256 tokenId,
        uint256 amount,
        uint256 lockDuration
    );
    event TreasuryVeNFTWithdrawn(uint256 tokenId, uint256 amount);

    IProratedVENFT public venft;
    IProratedGovernor public governor;
    ERC20 public lpToken;

    // Treasury's veNFT position
    uint256 public treasuryVeNFTTokenId;
    bool public treasuryVeNFTCreated;

    struct TreasuryParams {
        address venft;
        address governor;
        address lpToken;
        address owner;
    }

    constructor(TreasuryParams memory params) Owned(params.owner) {
        venft = IProratedVENFT(params.venft);
        governor = IProratedGovernor(params.governor);
        lpToken = ERC20(params.lpToken);
    }

    /// @notice Creates veNFT position for treasury LP tokens
    /// @param amount Amount of LP tokens to lock
    /// @param lockDuration Lock duration in seconds
    /// @dev Can only be called by governor
    function createTreasuryVeNFTPosition(
        uint256 amount,
        uint256 lockDuration
    ) external {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        if (treasuryVeNFTCreated) revert Unauthorized();

        // Approve VENFT to spend LP tokens
        lpToken.approve(address(venft), amount);

        // Create veNFT position
        treasuryVeNFTTokenId = venft.createLock(amount, lockDuration);
        treasuryVeNFTCreated = true;

        emit TreasuryVeNFTCreated(treasuryVeNFTTokenId, amount, lockDuration);
    }

    /// @notice Withdraws decayed amount from treasury veNFT position
    /// @dev Can only be called by governor
    function withdrawTreasuryDecayed() external {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (!treasuryVeNFTCreated) revert NoVeNFTPosition();

        uint256 balanceBefore = lpToken.balanceOf(address(this));
        venft.withdrawDecayed(treasuryVeNFTTokenId);
        uint256 withdrawnAmount = lpToken.balanceOf(address(this)) -
            balanceBefore;

        emit TreasuryVeNFTWithdrawn(treasuryVeNFTTokenId, withdrawnAmount);
    }

    /// @notice Distributes LP tokens to a recipient
    /// @param recipient Address to receive the tokens
    /// @param amount Amount of LP tokens to distribute
    /// @param reason Reason for distribution
    /// @dev Can only be called by governor
    function distributeFunds(
        address recipient,
        uint256 amount,
        string memory reason
    ) external {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        if (lpToken.balanceOf(address(this)) < amount)
            revert InsufficientBalance();

        lpToken.safeTransfer(recipient, amount);

        emit TreasuryFundsDistributed(recipient, amount, reason);
    }

    /// @notice Gets treasury's voting power from veNFT position
    /// @return votingPower Treasury's current voting power
    function getTreasuryVotingPower() external view returns (uint256) {
        if (!treasuryVeNFTCreated) return 0;
        return venft.balanceOfNFT(treasuryVeNFTTokenId);
    }

    /// @notice Gets treasury's LP token balance (including veNFT position)
    /// @return totalBalance Total LP tokens controlled by treasury
    function getTreasuryBalance() external view returns (uint256) {
        return lpToken.balanceOf(address(this));
    }
}
