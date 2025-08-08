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
        // Step 1: Delegate to internal function with msg.sender as recipient
        return _createLock(_value, _lockDuration, msg.sender);
    }

    /// @notice Internal function to create a new veNFT lock position
    /// @param _value Amount of tokens to lock
    /// @param _lockDuration Duration of the lock in seconds
    /// @param _to Address to receive the veNFT
    /// @return The token ID of the newly created veNFT
    /// @dev The lock duration is rounded up to the nearest week for protocol consistency.
    ///      This ensures all locks align with weekly epochs for reward distribution.
    function _createLock(
        uint256 _value,
        uint256 _lockDuration,
        address _to
    ) internal returns (uint256) {
        // Step 1: Validate input parameters first
        if (_value == 0) revert ZeroAmount();
        if (_to == address(0)) revert ZeroAddress();
        if (_lockDuration == 0) revert LockDurationNotInFuture();
        if (_lockDuration > MAXTIME) revert LockDurationTooLong();

        // Step 2: Calculate unlock time rounded up to nearest week
        uint256 unlockTime = ((block.timestamp + _lockDuration) / WEEK) * WEEK;

        // Step 3: Generate new token ID
        uint256 _tokenId = ++tokenId;

        // Step 4: Deposit tokens and create lock position (before minting NFT)
        _depositFor(_tokenId, _value, unlockTime, _locked[_tokenId]);

        // Step 5: Mint NFT to recipient after successful deposit
        _mint(_to, _tokenId);

        // Step 6: Emit lock creation event
        emit LockCreated(
            _to,
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
    /// @dev This function burns the old veNFT and creates a new one with the extended duration
    function extendLockDuration(
        uint256 _tokenId,
        uint256 _newDuration
    ) external nonReentrant {
        // Step 1: Check authorization (owner or approved operator)
        if (!_isApprovedOrOwner(msg.sender, _tokenId)) revert("NOT_AUTHORIZED");

        // Step 2: Get current locked balance and validate extension
        LockedBalance memory oldLocked = _locked[_tokenId];
        uint256 currentAmount = oldLocked.amount.toUint256();

        // Step 3: Validate that new duration is greater than current remaining time (allows extending expired locks)
        uint256 currentRemainingTime = oldLocked.end > block.timestamp
            ? oldLocked.end - block.timestamp
            : 0;
        if (_newDuration <= currentRemainingTime)
            revert LockDurationNotInFuture();

        // Step 4: Burn the old NFT and clear its locked balance
        _burn(_tokenId);
        _locked[_tokenId] = LockedBalance(0, 0);
        _checkpoint(_tokenId, oldLocked, LockedBalance(0, 0));

        // Step 5: Create new NFT with extended duration using _resetLock
        uint256 newTokenId = _resetLock(
            currentAmount,
            _newDuration,
            msg.sender
        );

        // Step 6: Emit lock extension event
        emit LockExtended(_tokenId, oldLocked.end, _locked[newTokenId].end);
    }

    /// @notice Internal function to create a new veNFT lock position without transferring tokens
    /// @param _value Amount of tokens to lock (already held by contract)
    /// @param _lockDuration Duration of the lock in seconds
    /// @param _to Address to receive the veNFT
    /// @return The token ID of the newly created veNFT
    /// @dev Used for lock extension (reset) where tokens are already in the contract
    function _resetLock(
        uint256 _value,
        uint256 _lockDuration,
        address _to
    ) internal returns (uint256) {
        // Step 1: Calculate unlock time rounded up to nearest week for protocol consistency
        uint256 unlockTime = ((block.timestamp + _lockDuration) / WEEK) * WEEK;

        // Step 2: Validate input parameters
        if (_value == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert LockDurationNotInFuture();
        if (unlockTime > block.timestamp + MAXTIME)
            revert LockDurationTooLong();

        // Step 3: Generate new token ID for the reset lock
        uint256 _tokenId = ++tokenId;

        // Step 4: Mint NFT to recipient (tokens already in contract, no transfer needed)
        _mint(_to, _tokenId);

        // Step 5: Update total supply to include the new lock amount
        uint256 supplyBefore = supply;
        supply = supplyBefore + _value;

        // Step 6: Create new locked balance with extended duration
        LockedBalance memory newLocked = LockedBalance(
            _value.toInt128(),
            unlockTime
        );
        _locked[_tokenId] = newLocked;

        // Step 7: Update voting power history for the new lock
        _checkpoint(_tokenId, LockedBalance(0, 0), newLocked);

        return _tokenId;
    }

    /// @notice Increases the locked amount for an existing veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @param _value Additional amount of tokens to lock
    /// @dev The lock duration remains the same, only the amount increases
    function increaseAmount(
        uint256 _tokenId,
        uint256 _value
    ) external nonReentrant {
        if (!_isApprovedOrOwner(msg.sender, _tokenId)) revert("NOT_AUTHORIZED");
        _increaseAmountFor(_tokenId, _value);
    }

    /// @notice Internal function to increase the locked amount for a veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @param _value Additional amount of tokens to lock
    function _increaseAmountFor(uint256 _tokenId, uint256 _value) internal {
        LockedBalance memory oldLocked = _locked[_tokenId];

        if (_value == 0) revert ZeroAmount();
        if (oldLocked.amount <= 0) revert NoLockFound();
        if (oldLocked.end <= block.timestamp) revert LockExpired();

        _depositFor(_tokenId, _value, 0, oldLocked);
    }

    // ============ VOTING POWER QUERIES ============
    /// @notice Gets the current voting power of a veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @return The current voting power of the position
    function balanceOfNFT(uint256 _tokenId) public view returns (uint256) {
        return _balanceOfNFTAt(_tokenId, block.timestamp);
    }

    /// @notice Gets the voting power of a veNFT position at a specific timestamp
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
    /// @return The total voting power at the current timestamp
    function totalSupply() external view returns (uint256) {
        return _supplyAt(block.timestamp);
    }

    /// @notice Gets the total voting power across all veNFT positions at a specific timestamp
    /// @param _timestamp The timestamp to query total voting power at
    /// @return The total voting power at the specified timestamp
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256) {
        return _supplyAt(_timestamp);
    }

    /// @notice Internal function to get the total voting power at current timestamp
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
    function getPendingRewards(
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
