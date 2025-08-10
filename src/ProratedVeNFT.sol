// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {ERC721} from "lib/solmate/src/tokens/ERC721.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";

import {SafeCastLibrary} from "./libraries/SafeCastLibrary.sol";

/// @title Prorated Voting Escrow NFT
/// @notice A simplified veNFT implementation for the Prorated protocol
/// @dev This contract allows users to lock LP tokens and receive voting power that decays linearly over time.
///      Users can withdraw the decayed portion of their locked tokens while maintaining voting power for the remaining portion.
///      Rewards are distributed based on voting power and auto-compounded into locked positions.
/// @author Prorated Protocol
contract ProratedVeNFT is ERC721, ReentrancyGuard {
    using SafeTransferLib for ERC20;
    using SafeCastLibrary for int128;
    using SafeCastLibrary for uint256;

    // ============ ERRORS ============
    error ZeroAmount();
    error ZeroAddress();
    error LockDurationNotInFuture();
    error LockDurationTooLong();
    error LockExpired();
    error LockNotExpired();
    error NoLockFound();
    error NonExistentToken();
    error SameNFT();
    error AmountTooBig();
    error ZeroBalance();
    error NoRewardsToDistribute();
    error NoVotingPower();
    error NoRewardsToCompound();

    // ============ EVENTS ============
    event VeNFTInitialized(
        address indexed token,
        string name,
        string symbol,
        uint256 ts
    );
    event Deposit(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 locktime,
        uint256 ts
    );
    event Withdraw(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 ts
    );
    event WithdrawDecayed(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 ts
    );
    event Compounded(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 ts
    );
    event RewardsDistributed(
        address indexed distributor,
        uint256 amount,
        uint256 globalRewardPerVotingPower
    );
    event LockExtended(uint256 indexed tokenId, uint256 oldEnd, uint256 newEnd);
    event LockCreated(
        address indexed owner,
        uint256 indexed tokenId,
        uint256 value,
        uint256 lockDuration,
        uint256 unlockTime,
        uint256 ts
    );

    // ============ CONSTANTS ============
    uint256 internal constant WEEK = 1 weeks;
    uint256 internal constant MAXTIME = 4 * 365 * 86400;
    int128 internal constant I_MAXTIME = 4 * 365 * 86400;

    // ============ STATE VARIABLES ============
    ERC20 public immutable TOKEN;
    uint256 public tokenId;
    uint256 public supply;

    uint256 public globalRewardPerVotingPower;
    mapping(uint256 => uint256) public userRewardPerVotingPowerPaid;

    mapping(uint256 => LockedBalance) internal _locked;
    mapping(uint256 => UserPoint[1000000000]) internal _userPointHistory;
    mapping(uint256 => uint256) public userPointEpoch;
    mapping(uint256 => int128) public slopeChanges;

    mapping(uint256 => GlobalPoint) internal _pointHistory;
    uint256 public epoch;

    // ============ STRUCTS ============
    struct LockedBalance {
        int128 amount;
        uint256 end;
    }

    struct UserPoint {
        int128 bias;
        int128 slope;
        uint256 ts;
    }

    struct GlobalPoint {
        int128 bias;
        int128 slope;
        uint256 ts;
    }

    // ============ CONSTRUCTOR ============
    /// @notice Initializes the Prorated veNFT contract
    /// @param _token The ERC20 token address to be locked (LP tokens)
    /// @param _name The ERC721 name to set
    /// @param _symbol The ERC721 symbol to set
    constructor(
        address _token,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        // Step 1: Set the immutable token address for LP token locking
        TOKEN = ERC20(_token);
        // Step 2: Initialize the global point history with current timestamp
        _pointHistory[0].ts = block.timestamp;
        // Step 3: Emit initialization event for off-chain indexing
        emit VeNFTInitialized(_token, _name, _symbol, block.timestamp);
    }

    // ============ LOCK CREATION & MANAGEMENT ============
    /// @notice Creates a new veNFT lock position
    /// @param _value Amount of tokens to lock
    /// @param _lockDuration Duration of the lock in seconds
    /// @return The token ID of the newly created veNFT
    /// @dev The lock duration is rounded up to the nearest week for protocol consistency.
    ///      For example, a 1-day lock becomes a 1-week lock, a 8-day lock becomes a 2-week lock.
    function createLock(
        uint256 _value,
        uint256 _lockDuration
    ) external nonReentrant returns (uint256) {
        // Step 1: Validate input parameters first
        if (_value == 0) revert ZeroAmount();
        if (_lockDuration == 0) revert LockDurationNotInFuture();
        if (_lockDuration > MAXTIME) revert LockDurationTooLong();
        // Step 2: Calculate unlock time using shared helper
        uint256 unlockTime = _computeUnlockTime(_lockDuration);
        // Step 3: Generate new token ID
        uint256 _tokenId = ++tokenId;
        // Step 4: Deposit tokens and create lock position (before minting NFT)
        _depositFor(_tokenId, _value, unlockTime, _locked[_tokenId]);
        // Step 5: Mint NFT to recipient after successful deposit
        _mint(msg.sender, _tokenId);
        // Step 6: Emit lock creation event
        emit LockCreated(
            msg.sender,
            _tokenId,
            _value,
            _lockDuration,
            unlockTime,
            block.timestamp
        );
        return _tokenId;
    }

    /// @notice Extends the lock duration of a veNFT position
    /// @param _tokenId The token ID of the veNFT position to extend
    /// @param _newDuration New lock duration in seconds
    /// @dev In-place extension: preserves tokenId, ownership, approvals and accounting
    function increaseLockDuration(
        uint256 _tokenId,
        uint256 _newDuration
    ) external nonReentrant {
        // Step 1: Owner-only authorization and compute target end (validates duration bounds)
        if (_ownerOf[_tokenId] != msg.sender) revert("NOT_AUTHORIZED");
        uint256 newEnd = _computeUnlockTime(_newDuration);
        // Step 2: Load current lock and enforce monotonicity (newEnd must increase)
        LockedBalance memory oldLocked = _locked[_tokenId];
        if (newEnd <= oldLocked.end) revert LockDurationNotInFuture();
        // Step 3: Snapshot reward accounting state BEFORE modifying voting power
        (
            uint256 globalIndexBefore,
            ,
            ,
            uint256 pendingBefore
        ) = _snapshotPending(_tokenId);
        // Step 4: Update in-place and checkpoint
        LockedBalance memory newLocked = LockedBalance(
            oldLocked.amount,
            newEnd
        );
        _locked[_tokenId] = newLocked;
        _checkpoint(_tokenId, oldLocked, newLocked);
        // Step 5: Preserve pending rewards across extension by adjusting paid index
        _preservePendingAfter(_tokenId, globalIndexBefore, pendingBefore);
        // Step 6: Emit event
        emit LockExtended(_tokenId, oldLocked.end, newEnd);
    }

    /// @notice Increases the locked amount for an existing veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @param _value Additional amount of tokens to lock
    /// @dev The lock duration remains the same, only the amount increases
    function increaseLockAmount(
        uint256 _tokenId,
        uint256 _value
    ) external nonReentrant {
        // Step 1: Owner-only authorization and input validation
        if (_ownerOf[_tokenId] != msg.sender) revert("NOT_AUTHORIZED");
        if (_value == 0) revert ZeroAmount();
        LockedBalance memory oldLocked = _locked[_tokenId];
        if (oldLocked.amount <= 0) revert NoLockFound();
        if (oldLocked.end <= block.timestamp) revert LockExpired();
        // Step 2: Snapshot pending rewards to preserve at the moment of amount increase
        (
            uint256 globalIndexBefore,
            ,
            ,
            uint256 pendingBefore
        ) = _snapshotPending(_tokenId);
        // Step 3: Deposit tokens and create lock position (before minting NFT)
        _depositFor(_tokenId, _value, 0, oldLocked);
        // Step 4: Adjust paid index so pendingAfter equals pendingBefore with higher voting power
        _preservePendingAfter(_tokenId, globalIndexBefore, pendingBefore);
        // Step 5: Emit event
        emit LockExtended(_tokenId, oldLocked.end, oldLocked.end);
    }

    /// @notice Rounds a timestamp up to the nearest week boundary
    /// @param ts The timestamp to round
    /// @return The timestamp rounded up to the next multiple of WEEK
    function _ceilToWeek(uint256 ts) internal pure returns (uint256) {
        // Step 1: Perform ceiling division to the next week boundary
        return ((ts + WEEK - 1) / WEEK) * WEEK;
    }

    /// @notice Computes the maximum allowed unlock time (now + MAXTIME) rounded to week boundary
    /// @param nowTs The reference timestamp to add MAXTIME to
    /// @return The maximum unlock time rounded to the nearest week boundary
    function _maxUnlockTimeWeek(uint256 nowTs) internal pure returns (uint256) {
        // Step 1: Add MAXTIME and floor to the last completed week (equivalent to rounding target up once)
        return ((nowTs + MAXTIME) / WEEK) * WEEK;
    }

    /// @notice Computes the canonical unlock time for a given duration with week rounding and max cap
    /// @param lockDuration The desired lock duration in seconds
    /// @return unlockTime The computed unlock time respecting rounding and MAXTIME
    function _computeUnlockTime(
        uint256 lockDuration
    ) internal view returns (uint256 unlockTime) {
        // Step 1: Validate duration bounds
        if (lockDuration == 0) revert LockDurationNotInFuture();
        if (lockDuration > MAXTIME) revert LockDurationTooLong();
        // Step 2: Round up (now + duration) to the nearest week
        unlockTime = _ceilToWeek(block.timestamp + lockDuration);
        // Step 3: Compute the maximum allowed unlock time rounded to a week
        uint256 maxUnlockTime = _maxUnlockTimeWeek(block.timestamp);
        // Step 4: Cap unlock time at maximum
        if (unlockTime > maxUnlockTime) unlockTime = maxUnlockTime;
        // Step 5: Return canonical unlock time
        return unlockTime;
    }

    /// @notice Snapshots the reward accounting state for a token before a voting-power change
    /// @param _tokenId The token ID to snapshot
    /// @return globalIndexBefore The global reward index at snapshot
    /// @return userPaidIndexBefore The user paid index at snapshot
    /// @return votingPowerBefore The user voting power at snapshot
    /// @return pendingBefore The computed pending rewards at snapshot
    function _snapshotPending(
        uint256 _tokenId
    )
        internal
        view
        returns (
            uint256 globalIndexBefore,
            uint256 userPaidIndexBefore,
            uint256 votingPowerBefore,
            uint256 pendingBefore
        )
    {
        // Step 1: Capture indices
        globalIndexBefore = globalRewardPerVotingPower;
        userPaidIndexBefore = userRewardPerVotingPowerPaid[_tokenId];
        // Step 2: Get current voting power
        votingPowerBefore = _balanceOfNFTAt(_tokenId, block.timestamp);
        // Step 3: Compute pending rewards if eligible
        pendingBefore = 0;
        if (votingPowerBefore > 0 && globalIndexBefore > userPaidIndexBefore) {
            pendingBefore =
                (votingPowerBefore *
                    (globalIndexBefore - userPaidIndexBefore)) /
                1e18;
        }
    }

    /// @notice Adjusts the user paid index so that pending rewards remain unchanged after a change
    /// @param _tokenId The token whose accounting is being adjusted
    /// @param globalIndexBefore The global index captured before the change
    /// @param pendingBefore The pending rewards computed before the change
    function _preservePendingAfter(
        uint256 _tokenId,
        uint256 globalIndexBefore,
        uint256 pendingBefore
    ) internal {
        // Step 1: Recompute voting power after the change
        uint256 votingPowerAfter = _balanceOfNFTAt(_tokenId, block.timestamp);
        // Step 2: If no voting power, set paid index to the current global index
        if (votingPowerAfter == 0) {
            userRewardPerVotingPowerPaid[_tokenId] = globalIndexBefore;
        } else {
            // Step 3: Compute the index adjustment that preserves pending rewards
            uint256 adjustment = (pendingBefore * 1e18) / votingPowerAfter;
            // Step 4: Apply adjustment defensively (saturate at zero)
            uint256 paidAfter = 0;
            if (globalIndexBefore > adjustment) {
                paidAfter = globalIndexBefore - adjustment;
            }
            userRewardPerVotingPowerPaid[_tokenId] = paidAfter;
        }
    }

    // ============ VOTING POWER QUERIES ============
    /// @notice Gets the current voting power of a veNFT position
    /// @dev Returns 0 for non-existent tokens or fully expired locks; does not revert.
    ///      At exact checkpoint timestamps, this returns the stored bias without additional decay.
    /// @param _tokenId The token ID of the veNFT position
    /// @return The current voting power of the position
    function balanceOfNFT(uint256 _tokenId) public view returns (uint256) {
        return _balanceOfNFTAt(_tokenId, block.timestamp);
    }

    /// @notice Gets the voting power of a veNFT position at a specific timestamp
    /// @dev Returns 0 for non-existent tokens or if voting power has fully decayed by `_t`.
    ///      If `_t` equals a stored checkpoint timestamp, returns that exact checkpoint bias.
    /// @param _tokenId The token ID of the veNFT position
    /// @param _t The timestamp to query voting power at
    /// @return The voting power of the position at the specified timestamp
    function balanceOfNFTAt(
        uint256 _tokenId,
        uint256 _t
    ) external view returns (uint256) {
        return _balanceOfNFTAt(_tokenId, _t);
    }

    /// @notice Gets the total voting power across all veNFT positions
    /// @dev Returns 0 when there are no active locks; does not revert.
    ///      If called at an exact global checkpoint timestamp, this returns the stored bias.
    /// @return The total voting power at the current timestamp
    function totalSupply() external view returns (uint256) {
        return _supplyAt(block.timestamp);
    }

    /// @notice Gets the total voting power across all veNFT positions at a specific timestamp
    /// @dev Returns 0 if supply has fully decayed by `_timestamp`. If `_timestamp` equals an
    ///      existing global checkpoint, returns that checkpoint's bias without extra decay.
    /// @param _timestamp The timestamp to query total voting power at
    /// @return The total voting power at the specified timestamp
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256) {
        return _supplyAt(_timestamp);
    }

    /// @notice Internal function to get the total voting power at current timestamp
    /// @dev Helper used by public supply getters; saturates at zero when fully decayed.
    /// @return The total voting power at the current timestamp
    function _totalSupply() internal view returns (uint256) {
        return _supplyAt(block.timestamp);
    }

    // ============ REWARD SYSTEM ============
    /// @notice Distributes rewards to all veNFT holders based on their voting power
    /// @param _rewardAmount Amount of LP tokens to distribute as rewards
    /// @dev This function updates the global reward index and transfers tokens from the sender
    function distributeRewards(uint256 _rewardAmount) external {
        if (_rewardAmount == 0) revert NoRewardsToDistribute();

        uint256 totalVotingPower = _totalSupply();
        if (totalVotingPower == 0) revert NoVotingPower();

        globalRewardPerVotingPower += (_rewardAmount * 1e18) / totalVotingPower;

        TOKEN.safeTransferFrom(msg.sender, address(this), _rewardAmount);

        emit RewardsDistributed(
            msg.sender,
            _rewardAmount,
            globalRewardPerVotingPower
        );
    }

    /// @notice Manually compounds pending rewards for a veNFT position
    /// @param _tokenId The token ID of the veNFT position to compound rewards for
    /// @dev This function adds pending rewards to the locked amount and updates the user's paid index
    function compound(uint256 _tokenId) external nonReentrant {
        if (!_isApprovedOrOwner(msg.sender, _tokenId)) revert("NOT_AUTHORIZED");
        uint256 compoundedAmount = _compound(_tokenId);
        emit Compounded(
            msg.sender,
            _tokenId,
            compoundedAmount,
            block.timestamp
        );
    }

    /// @notice Internal function to compound pending rewards for a veNFT position
    /// @param _tokenId The token ID of the veNFT position to compound rewards for
    /// @return The amount that was compounded
    function _compound(uint256 _tokenId) internal returns (uint256) {
        uint256 userVotingPower = balanceOfNFT(_tokenId);
        uint256 owed = ((userVotingPower *
            (globalRewardPerVotingPower -
                userRewardPerVotingPowerPaid[_tokenId])) / 1e18);

        if (owed > 0) {
            LockedBalance memory oldLocked = _locked[_tokenId];
            LockedBalance memory newLocked = LockedBalance(
                oldLocked.amount + owed.toInt128(),
                oldLocked.end
            );

            _locked[_tokenId] = newLocked;
            _checkpoint(_tokenId, oldLocked, newLocked);
        }

        userRewardPerVotingPowerPaid[_tokenId] = globalRewardPerVotingPower;
        return owed;
    }

    /// @notice Gets the pending rewards for a veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @return The amount of pending rewards for the position
    function pendingRewardsOf(
        uint256 _tokenId
    ) external view returns (uint256) {
        uint256 userVotingPower = balanceOfNFT(_tokenId);
        uint256 owed = ((userVotingPower *
            (globalRewardPerVotingPower -
                userRewardPerVotingPowerPaid[_tokenId])) / 1e18);
        return owed;
    }

    // ============ WITHDRAWAL OPERATIONS ============
    /// @notice Withdraws all locked tokens from an expired veNFT position
    /// @param _tokenId The token ID of the veNFT position to withdraw from
    /// @dev This function burns the veNFT and transfers all locked tokens to the owner
    function withdraw(uint256 _tokenId) external nonReentrant {
        if (!_isApprovedOrOwner(msg.sender, _tokenId)) revert("NOT_AUTHORIZED");

        LockedBalance memory oldLocked = _locked[_tokenId];
        if (block.timestamp < oldLocked.end) revert LockNotExpired();
        uint256 value = oldLocked.amount.toUint256();

        // Burn the NFT
        _burn(_tokenId);
        _locked[_tokenId] = LockedBalance(0, 0);
        uint256 supplyBefore = supply;
        supply = supplyBefore - value;

        _checkpoint(_tokenId, oldLocked, LockedBalance(0, 0));

        TOKEN.safeTransfer(msg.sender, value);

        emit Withdraw(msg.sender, _tokenId, value, block.timestamp);
    }

    /// @notice Withdraws the decayed portion of locked tokens from a veNFT position
    /// @param _tokenId The token ID of the veNFT position to withdraw from
    /// @dev This function allows partial withdrawal while maintaining voting power for the remaining portion
    function withdrawDecayed(uint256 _tokenId) external nonReentrant {
        if (!_isApprovedOrOwner(msg.sender, _tokenId)) revert("NOT_AUTHORIZED");

        LockedBalance memory oldLocked = _locked[_tokenId];
        uint256 currentVotingPower = balanceOfNFT(_tokenId);
        uint256 decayedAmount = oldLocked.amount.toUint256() -
            currentVotingPower;

        if (decayedAmount == 0) revert ZeroBalance();

        uint256 remainingAmount = currentVotingPower;
        LockedBalance memory newLocked = LockedBalance(
            remainingAmount.toInt128(),
            oldLocked.end
        );

        _locked[_tokenId] = newLocked;
        _checkpoint(_tokenId, oldLocked, newLocked);

        TOKEN.safeTransfer(msg.sender, decayedAmount);

        emit WithdrawDecayed(
            msg.sender,
            _tokenId,
            decayedAmount,
            block.timestamp
        );
    }

    // ============ UTILITY FUNCTIONS ============
    /// @notice Returns the token URI for a given token ID
    /// @param id The token ID
    /// @return The token URI (empty string for this implementation)
    function tokenURI(
        uint256 id // solhint-disable-line no-unused-vars
    ) public view virtual override returns (string memory) {
        return ""; // No metadata URI for veNFT positions
    }

    // ============ INTERNAL FUNCTIONS ============
    /// @notice Checks if an address is approved or is the owner of a veNFT position
    /// @param _spender The address to check approval for
    /// @param _tokenId The token ID of the veNFT position
    /// @return True if the address is approved or is the owner, false otherwise
    function _isApprovedOrOwner(
        address _spender,
        uint256 _tokenId
    ) internal view returns (bool) {
        address tokenOwner = _ownerOf[_tokenId];
        bool spenderIsOwner = tokenOwner == _spender;
        bool spenderIsApproved = _spender == getApproved[_tokenId];
        bool spenderIsApprovedForAll = isApprovedForAll[tokenOwner][_spender];
        return spenderIsOwner || spenderIsApproved || spenderIsApprovedForAll;
    }

    /// @notice Internal function to deposit tokens for a veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @param _value Amount of tokens to deposit
    /// @param _unlockTime The unlock time for the position (0 to keep existing)
    /// @param _oldLocked The previous locked balance
    function _depositFor(
        uint256 _tokenId,
        uint256 _value,
        uint256 _unlockTime,
        LockedBalance memory _oldLocked
    ) internal {
        uint256 supplyBefore = supply;
        supply = supplyBefore + _value;

        LockedBalance memory newLocked;
        (newLocked.amount, newLocked.end) = (_oldLocked.amount, _oldLocked.end);

        newLocked.amount += _value.toInt128();
        if (_unlockTime != 0) {
            newLocked.end = _unlockTime;
        }
        _locked[_tokenId] = newLocked;

        _checkpoint(_tokenId, _oldLocked, newLocked);

        if (_value != 0) {
            TOKEN.safeTransferFrom(msg.sender, address(this), _value);
        }

        emit Deposit(
            msg.sender,
            _tokenId,
            _value,
            newLocked.end,
            block.timestamp
        );
    }

    /// @notice Internal function to update voting power checkpoints
    /// @param _tokenId The token ID of the veNFT position (0 for global checkpoint)
    /// @param _oldLocked The previous locked balance
    /// @param _newLocked The new locked balance
    function _checkpoint(
        uint256 _tokenId,
        LockedBalance memory _oldLocked,
        LockedBalance memory _newLocked
    ) internal {
        UserPoint memory uOld;
        UserPoint memory uNew;
        int128 oldDslope = 0;
        int128 newDslope = 0;
        uint256 _epoch = epoch;

        if (_tokenId != 0) {
            if (_oldLocked.end > block.timestamp && _oldLocked.amount > 0) {
                uOld.slope = _oldLocked.amount / I_MAXTIME;
                uOld.bias =
                    uOld.slope *
                    (_oldLocked.end - block.timestamp).toInt128();
            }
            if (_newLocked.end > block.timestamp && _newLocked.amount > 0) {
                uNew.slope = _newLocked.amount / I_MAXTIME;
                uNew.bias =
                    uNew.slope *
                    (_newLocked.end - block.timestamp).toInt128();
            }

            oldDslope = slopeChanges[_oldLocked.end];
            if (_newLocked.end != 0) {
                if (_newLocked.end == _oldLocked.end) {
                    newDslope = oldDslope;
                } else {
                    newDslope = slopeChanges[_newLocked.end];
                }
            }
        }

        GlobalPoint memory lastPoint = GlobalPoint({
            bias: 0,
            slope: 0,
            ts: block.timestamp
        });
        if (_epoch > 0) {
            lastPoint = _pointHistory[_epoch];
        }
        uint256 lastCheckpoint = lastPoint.ts;

        {
            uint256 t_i = (lastCheckpoint / WEEK) * WEEK;
            for (uint256 i = 0; i < 255; ++i) {
                t_i += WEEK;
                int128 d_slope = 0;
                if (t_i > block.timestamp) {
                    t_i = block.timestamp;
                } else {
                    d_slope = slopeChanges[t_i];
                }
                lastPoint.bias -=
                    lastPoint.slope *
                    (t_i - lastCheckpoint).toInt128();
                lastPoint.slope += d_slope;
                if (lastPoint.bias < 0) {
                    lastPoint.bias = 0;
                }
                if (lastPoint.slope < 0) {
                    lastPoint.slope = 0;
                }
                lastCheckpoint = t_i;
                lastPoint.ts = t_i;
                _epoch += 1;
                if (t_i == block.timestamp) {
                    break;
                } else {
                    _pointHistory[_epoch] = lastPoint;
                }
            }
        }

        if (_tokenId != 0) {
            lastPoint.slope += (uNew.slope - uOld.slope);
            lastPoint.bias += (uNew.bias - uOld.bias);
            if (lastPoint.slope < 0) {
                lastPoint.slope = 0;
            }
            if (lastPoint.bias < 0) {
                lastPoint.bias = 0;
            }
        }

        if (_epoch != 1 && _pointHistory[_epoch - 1].ts == block.timestamp) {
            _pointHistory[_epoch - 1] = lastPoint;
        } else {
            epoch = _epoch;
            _pointHistory[_epoch] = lastPoint;
        }

        if (_tokenId != 0) {
            if (_oldLocked.end > block.timestamp) {
                oldDslope += uOld.slope;
                if (_newLocked.end == _oldLocked.end) {
                    oldDslope -= uNew.slope;
                }
                slopeChanges[_oldLocked.end] = oldDslope;
            }

            if (_newLocked.end > block.timestamp) {
                if ((_newLocked.end > _oldLocked.end)) {
                    newDslope -= uNew.slope;
                    slopeChanges[_newLocked.end] = newDslope;
                }
            }

            uNew.ts = block.timestamp;
            uint256 userEpoch = userPointEpoch[_tokenId];
            if (
                userEpoch != 0 &&
                _userPointHistory[_tokenId][userEpoch].ts == block.timestamp
            ) {
                _userPointHistory[_tokenId][userEpoch] = uNew;
            } else {
                userPointEpoch[_tokenId] = ++userEpoch;
                _userPointHistory[_tokenId][userEpoch] = uNew;
            }
        }
    }

    /// @notice Internal function to get voting power at a specific timestamp
    /// @param _tokenId The token ID of the veNFT position
    /// @param _t The timestamp to query voting power at
    /// @return The voting power at the specified timestamp
    function _balanceOfNFTAt(
        uint256 _tokenId,
        uint256 _t
    ) internal view returns (uint256) {
        uint256 _epoch = userPointEpoch[_tokenId];
        if (_epoch == 0) return 0;

        uint256 lower = 0;
        uint256 upper = _epoch;
        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            UserPoint memory userPoint = _userPointHistory[_tokenId][center];
            if (userPoint.ts == _t) {
                return userPoint.bias.toUint256();
            } else if (userPoint.ts < _t) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }

        UserPoint memory lastPoint = _userPointHistory[_tokenId][lower];
        lastPoint.bias -= lastPoint.slope * (_t - lastPoint.ts).toInt128();
        if (lastPoint.bias < 0) {
            lastPoint.bias = 0;
        }
        return lastPoint.bias.toUint256();
    }

    /// @notice Internal function to get total voting power at a specific timestamp
    /// @dev Returns the global bias at `_timestamp`, using the nearest checkpoint ≤ `_timestamp`
    ///      and decaying it forward; saturates at zero.
    /// @param _timestamp The timestamp to query total voting power at
    /// @return The total voting power at the specified timestamp
    function _supplyAt(uint256 _timestamp) internal view returns (uint256) {
        uint256 _epoch = epoch;
        uint256 lower = 0;
        uint256 upper = _epoch;
        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            GlobalPoint memory globalPoint = _pointHistory[center];
            if (globalPoint.ts == _timestamp) {
                return globalPoint.bias.toUint256();
            } else if (globalPoint.ts < _timestamp) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }

        GlobalPoint memory lastPoint = _pointHistory[lower];
        lastPoint.bias -=
            lastPoint.slope *
            (_timestamp - lastPoint.ts).toInt128();
        if (lastPoint.bias < 0) {
            lastPoint.bias = 0;
        }
        return lastPoint.bias.toUint256();
    }

    // ============ VIEW FUNCTIONS ============
    /// @notice Gets the locked balance for a veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @return The locked balance struct containing amount and end time
    function locked(
        uint256 _tokenId
    ) external view returns (LockedBalance memory) {
        return _locked[_tokenId];
    }

    /// @notice Gets a specific user point from the voting power history
    /// @param _tokenId The token ID of the veNFT position
    /// @param _loc The index of the user point to retrieve
    /// @return The user point struct containing bias, slope, and timestamp
    function userPointHistory(
        uint256 _tokenId,
        uint256 _loc
    ) external view returns (UserPoint memory) {
        return _userPointHistory[_tokenId][_loc];
    }

    /// @notice Gets a specific global point from the total voting power history
    /// @param _loc The index of the global point to retrieve
    /// @return The global point struct containing bias, slope, and timestamp
    function pointHistory(
        uint256 _loc
    ) external view returns (GlobalPoint memory) {
        return _pointHistory[_loc];
    }
}
