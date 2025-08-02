// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";
import {SafeTransferLib} from "lib/solmate/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solmate/src/utils/ReentrancyGuard.sol";

import {SafeCastLibrary} from "./libraries/SafeCastLibrary.sol";

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

/// @title Prorated Voting Escrow NFT
/// @notice A simplified veNFT implementation for the Prorated protocol
/// @dev This contract allows users to lock LP tokens and receive voting power that decays linearly over time.
///      Users can withdraw the decayed portion of their locked tokens while maintaining voting power for the remaining portion.
///      Rewards are distributed based on voting power and auto-compounded into locked positions.
/// @author Prorated Protocol
contract ProratedVENFT is ReentrancyGuard {
    using SafeTransferLib for ERC20;
    using SafeCastLibrary for int128;
    using SafeCastLibrary for uint256;

    // ============ ERRORS ============
    error ZeroAmount();
    error LockDurationNotInFuture();
    error LockDurationTooLong();
    error LockExpired();
    error LockNotExpired();
    error NoLockFound();
    error NotApprovedOrOwner();
    error NonExistentToken();
    error SameNFT();
    error AmountTooBig();
    error ZeroBalance();
    error NoRewardsToDistribute();
    error NoVotingPower();
    error NoRewardsToCompound();

    error ERC721ReceiverRejectedTokens();
    error ERC721TransferToNonERC721ReceiverImplementer();

    // ============ EVENTS ============
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
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

    mapping(uint256 => address) internal idToOwner;
    mapping(address => uint256) internal ownerToNFTokenCount;
    mapping(uint256 => address) internal idToApprovals;
    mapping(address => mapping(address => bool)) internal ownerToOperators;

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
    /// @notice Initializes the ProratedVENFT contract
    /// @param _token The ERC20 token address to be locked (LP tokens)
    constructor(address _token) {
        TOKEN = ERC20(_token);
        _pointHistory[0].ts = block.timestamp;
    }

    // ============ BASIC LOCKING FUNCTIONS ============
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
        uint256 unlockTime = ((block.timestamp + _lockDuration) / WEEK) * WEEK;

        if (_value == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert LockDurationNotInFuture();
        if (unlockTime > block.timestamp + MAXTIME)
            revert LockDurationTooLong();

        uint256 _tokenId = ++tokenId;
        _mint(_to, _tokenId);

        _depositFor(_tokenId, _value, unlockTime, _locked[_tokenId]);
        return _tokenId;
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
        uint256 unlockTime = ((block.timestamp + _lockDuration) / WEEK) * WEEK;

        if (_value == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert LockDurationNotInFuture();
        if (unlockTime > block.timestamp + MAXTIME)
            revert LockDurationTooLong();

        uint256 _tokenId = ++tokenId;
        _mint(_to, _tokenId);

        // Create lock without transferring tokens (they're already in the contract)
        uint256 supplyBefore = supply;
        supply = supplyBefore + _value;

        LockedBalance memory newLocked = LockedBalance(
            _value.toInt128(),
            unlockTime
        );
        _locked[_tokenId] = newLocked;

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
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert NotApprovedOrOwner();
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

    /// @notice Withdraws all locked tokens from an expired veNFT position
    /// @param _tokenId The token ID of the veNFT position to withdraw from
    /// @dev This function burns the veNFT and transfers all locked tokens to the owner
    function withdraw(uint256 _tokenId) external nonReentrant {
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert NotApprovedOrOwner();

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
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert NotApprovedOrOwner();

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

    // ============ POSITION MANAGEMENT ============
    /// @notice Extends the lock duration of a veNFT position
    /// @param _tokenId The token ID of the veNFT position to extend
    /// @param _newDuration New lock duration in seconds
    /// @dev This function burns the old veNFT and creates a new one with the extended duration
    function extendLockDuration(
        uint256 _tokenId,
        uint256 _newDuration
    ) external nonReentrant {
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert NotApprovedOrOwner();

        LockedBalance memory oldLocked = _locked[_tokenId];
        uint256 currentAmount = oldLocked.amount.toUint256();

        _burn(_tokenId);
        _locked[_tokenId] = LockedBalance(0, 0);
        _checkpoint(_tokenId, oldLocked, LockedBalance(0, 0));

        uint256 newTokenId = _resetLock(
            currentAmount,
            _newDuration,
            msg.sender
        );

        emit LockExtended(_tokenId, oldLocked.end, _locked[newTokenId].end);
    }

    // ============ VOTING POWER FUNCTIONS ============
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

    /// @notice Internal function to get the total voting power at current timestamp
    /// @return The total voting power at the current timestamp
    function _totalSupply() internal view returns (uint256) {
        return _supplyAt(block.timestamp);
    }

    /// @notice Gets the total voting power across all veNFT positions at a specific timestamp
    /// @param _timestamp The timestamp to query total voting power at
    /// @return The total voting power at the specified timestamp
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256) {
        return _supplyAt(_timestamp);
    }

    // ============ REWARD DISTRIBUTION ============
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
        if (!_isApprovedOrOwner(msg.sender, _tokenId))
            revert NotApprovedOrOwner();
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

    // ============ ERC-721 FUNCTIONS ============
    /// @notice Gets the owner of a veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @return The address of the veNFT owner
    function ownerOf(uint256 _tokenId) external view returns (address) {
        return idToOwner[_tokenId];
    }

    /// @notice Gets the number of veNFT positions owned by an address
    /// @param _owner The address to query
    /// @return The number of veNFT positions owned by the address
    function balanceOf(address _owner) external view returns (uint256) {
        return ownerToNFTokenCount[_owner];
    }

    /// @notice Approves an address to transfer a specific veNFT position
    /// @param _approved The address to approve for transfer
    /// @param _tokenId The token ID of the veNFT position to approve
    function approve(address _approved, uint256 _tokenId) external {
        address tokenOwner = idToOwner[_tokenId];
        if (tokenOwner == address(0)) revert NonExistentToken();
        if (tokenOwner == _approved) revert SameNFT();

        bool senderIsOwner = (idToOwner[_tokenId] == msg.sender);
        bool senderIsApprovedForAll = ownerToOperators[tokenOwner][msg.sender];
        if (!senderIsOwner && !senderIsApprovedForAll)
            revert NotApprovedOrOwner();

        idToApprovals[_tokenId] = _approved;
        emit Approval(tokenOwner, _approved, _tokenId);
    }

    /// @notice Approves or revokes approval for an operator to manage all veNFT positions
    /// @param _operator The address to approve or revoke approval for
    /// @param _approved True to approve, false to revoke approval
    function setApprovalForAll(address _operator, bool _approved) external {
        if (_operator == msg.sender) revert SameNFT();
        ownerToOperators[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    /// @notice Gets the approved address for a specific veNFT position
    /// @param _tokenId The token ID of the veNFT position
    /// @return The address approved to transfer this veNFT position
    function getApproved(uint256 _tokenId) external view returns (address) {
        return idToApprovals[_tokenId];
    }

    /// @notice Checks if an operator is approved for all veNFT positions of an owner
    /// @param _owner The address that owns the veNFT positions
    /// @param _operator The address to check approval for
    /// @return True if the operator is approved for all positions, false otherwise
    function isApprovedForAll(
        address _owner,
        address _operator
    ) external view returns (bool) {
        return ownerToOperators[_owner][_operator];
    }

    /// @notice Transfers a veNFT position from one address to another
    /// @param _from The address to transfer from
    /// @param _to The address to transfer to
    /// @param _tokenId The token ID of the veNFT position to transfer
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external {
        _transferFrom(_from, _to, _tokenId, msg.sender);
    }

    /// @notice Safely transfers a veNFT position from one address to another
    /// @param _from The address to transfer from
    /// @param _to The address to transfer to
    /// @param _tokenId The token ID of the veNFT position to transfer
    /// @dev This function calls onERC721Received on the recipient if it's a contract
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external {
        safeTransferFrom(_from, _to, _tokenId, "");
    }

    /// @notice Safely transfers a veNFT position from one address to another with additional data
    /// @param _from The address to transfer from
    /// @param _to The address to transfer to
    /// @param _tokenId The token ID of the veNFT position to transfer
    /// @param _data Additional data to pass to the recipient contract
    /// @dev This function calls onERC721Received on the recipient if it's a contract
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory _data
    ) public {
        address sender = msg.sender;
        _transferFrom(_from, _to, _tokenId, sender);

        if (_isContract(_to)) {
            try
                IERC721Receiver(_to).onERC721Received(
                    sender,
                    _from,
                    _tokenId,
                    _data
                )
            returns (bytes4 response) {
                if (
                    response != IERC721Receiver(_to).onERC721Received.selector
                ) {
                    revert ERC721ReceiverRejectedTokens();
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert ERC721TransferToNonERC721ReceiverImplementer();
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
    }

    // ============ INTERNAL FUNCTIONS ============
    /// @notice Checks if an address is a contract
    /// @param account The address to check
    /// @return True if the address is a contract, false otherwise
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /// @notice Internal function to transfer a veNFT position
    /// @param _from The address to transfer from
    /// @param _to The address to transfer to
    /// @param _tokenId The token ID of the veNFT position to transfer
    /// @param _sender The address initiating the transfer
    function _transferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        address _sender
    ) internal {
        if (!_isApprovedOrOwner(_sender, _tokenId)) revert NotApprovedOrOwner();
        if (idToOwner[_tokenId] != _from) revert NotApprovedOrOwner();

        delete idToApprovals[_tokenId];
        _removeTokenFrom(_from, _tokenId);
        _addTokenTo(_to, _tokenId);

        emit Transfer(_from, _to, _tokenId);
    }

    /// @notice Checks if an address is approved or is the owner of a veNFT position
    /// @param _spender The address to check approval for
    /// @param _tokenId The token ID of the veNFT position
    /// @return True if the address is approved or is the owner, false otherwise
    function _isApprovedOrOwner(
        address _spender,
        uint256 _tokenId
    ) internal view returns (bool) {
        address tokenOwner = idToOwner[_tokenId];
        bool spenderIsOwner = tokenOwner == _spender;
        bool spenderIsApproved = _spender == idToApprovals[_tokenId];
        bool spenderIsApprovedForAll = ownerToOperators[tokenOwner][_spender];
        return spenderIsOwner || spenderIsApproved || spenderIsApprovedForAll;
    }

    /// @notice Internal function to mint a new veNFT position
    /// @param _to The address to receive the veNFT position
    /// @param _tokenId The token ID of the veNFT position to mint
    function _mint(address _to, uint256 _tokenId) internal {
        if (_to == address(0)) revert ZeroAmount();
        if (idToOwner[_tokenId] != address(0)) revert NonExistentToken();

        _addTokenTo(_to, _tokenId);
        emit Transfer(address(0), _to, _tokenId);
    }

    /// @notice Internal function to burn a veNFT position
    /// @param _tokenId The token ID of the veNFT position to burn
    function _burn(uint256 _tokenId) internal {
        address tokenOwner = idToOwner[_tokenId];
        if (tokenOwner == address(0)) revert NonExistentToken();

        delete idToApprovals[_tokenId];
        _removeTokenFrom(tokenOwner, _tokenId);
        emit Transfer(tokenOwner, address(0), _tokenId);
    }

    /// @notice Internal function to add a veNFT position to an address
    /// @param _to The address to add the veNFT position to
    /// @param _tokenId The token ID of the veNFT position to add
    function _addTokenTo(address _to, uint256 _tokenId) internal {
        idToOwner[_tokenId] = _to;
        ownerToNFTokenCount[_to]++;
    }

    /// @notice Internal function to remove a veNFT position from an address
    /// @param _from The address to remove the veNFT position from
    /// @param _tokenId The token ID of the veNFT position to remove
    function _removeTokenFrom(address _from, uint256 _tokenId) internal {
        if (idToOwner[_tokenId] != _from) revert NotApprovedOrOwner();
        delete idToOwner[_tokenId];
        ownerToNFTokenCount[_from]--;
    }

    /// @notice Internal function to transfer a veNFT position between addresses
    /// @param _from The address to transfer from
    /// @param _to The address to transfer to
    /// @param _tokenId The token ID of the veNFT position to transfer
    function _transfer(address _from, address _to, uint256 _tokenId) internal {
        _removeTokenFrom(_from, _tokenId);
        _addTokenTo(_to, _tokenId);
        emit Transfer(_from, _to, _tokenId);
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
