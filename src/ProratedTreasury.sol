// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";
import {Owned} from "lib/solmate/src/auth/Owned.sol";
import {IProratedVeNFT} from "./interfaces/IProratedVeNFT.sol";
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
    event TreasuryFundsTransferred(
        address indexed recipient,
        uint256 amount,
        string reason
    );

    IProratedVeNFT public venft;
    IProratedGovernor public governor;
    ERC20 public pair;

    uint256 public treasuryVeNFTTokenId;
    bool public treasuryVeNFTCreated;

    struct TreasuryParams {
        address venft;
        address governor;
        address pair;
        address owner;
    }

    constructor(TreasuryParams memory params) Owned(params.owner) {
        venft = IProratedVeNFT(params.venft);
        governor = IProratedGovernor(params.governor);
        pair = ERC20(params.pair);
    }

    // ============ TREASURY OPERATIONS ============

    /// @notice Withdraws decayed amount from treasury veNFT position
    /// @dev Governor-only; nonReentrant
    function withdrawTreasuryDecayed() external nonReentrant {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (!treasuryVeNFTCreated) revert NoVeNFTPosition();

        uint256 balanceBefore = pair.balanceOf(address(this));
        venft.withdrawDecayed(treasuryVeNFTTokenId);
        uint256 withdrawnAmount = pair.balanceOf(address(this)) - balanceBefore;

        emit TreasuryVeNFTWithdrawn(treasuryVeNFTTokenId, withdrawnAmount);
    }

    /// @notice Transfers LP tokens from treasury to a recipient (e.g., expenses)
    /// @param recipient Address to receive the tokens
    /// @param amount Amount to transfer
    /// @param reason Reason for transfer
    /// @dev Governor-only; nonReentrant
    function transferTreasuryFunds(
        address recipient,
        uint256 amount,
        string memory reason
    ) external nonReentrant {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (recipient == address(0)) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        if (pair.balanceOf(address(this)) < amount)
            revert InsufficientBalance();
        pair.safeTransfer(recipient, amount);
        emit TreasuryFundsTransferred(recipient, amount, reason);
    }

    /// @notice Increases the treasury veNFT lock amount with available LP tokens
    /// @param amount Amount to add to the lock
    /// @dev Governor-only; nonReentrant
    function increaseTreasuryLockAmount(uint256 amount) external nonReentrant {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (!treasuryVeNFTCreated) revert NoVeNFTPosition();
        if (amount == 0) revert InvalidAmount();
        if (pair.balanceOf(address(this)) < amount)
            revert InsufficientBalance();

        pair.approve(address(venft), amount);
        venft.increaseLockAmount(treasuryVeNFTTokenId, amount);
    }

    /// @notice Extends the treasury veNFT lock duration
    /// @param newDuration New lock duration in seconds
    /// @dev Governor-only; nonReentrant
    function extendTreasuryLockDuration(
        uint256 newDuration
    ) external nonReentrant {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (!treasuryVeNFTCreated) revert NoVeNFTPosition();
        venft.increaseLockDuration(treasuryVeNFTTokenId, newDuration);
    }

    /// @notice Compounds treasury pending rewards into the veNFT position
    /// @dev Governor-only; nonReentrant
    function compoundTreasuryRewards() external nonReentrant {
        if (msg.sender != address(governor)) revert Unauthorized();
        if (!treasuryVeNFTCreated) revert NoVeNFTPosition();
        venft.compound(treasuryVeNFTTokenId);
    }

    // ============ QUERY FUNCTIONS ============

    /// @notice Gets treasury's voting power from veNFT position
    /// @return votingPower Treasury's current voting power
    function getTreasuryVotingPower() external view returns (uint256) {
        if (!treasuryVeNFTCreated) return 0;
        return venft.balanceOfNFT(treasuryVeNFTTokenId);
    }

    /// @notice Gets treasury's LP token balance (including veNFT position)
    /// @return totalBalance Total LP tokens controlled by treasury
    function getTreasuryBalance() external view returns (uint256) {
        return pair.balanceOf(address(this));
    }
}
