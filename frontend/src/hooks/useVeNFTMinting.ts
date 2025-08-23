import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { Address } from 'viem'
import { getProratedPoolConfig } from '@/lib/contracts'

export interface VeNFTMintingState {
  isClaiming: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  txHash: string | null
  claimedTokenId: number | null
}

export interface UserContribution {
  amount: bigint
  lockDuration: bigint
  shares: bigint
  claimed: boolean
}

export function useVeNFTMinting(poolAddress: Address) {
  const { address: userAddress } = useAccount()
  const [mintingState, setMintingState] = useState<VeNFTMintingState>({
    isClaiming: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    txHash: null,
    claimedTokenId: null
  })

  // Read user's contribution data
  const { data: userContribution } = useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'getUserContribution',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress
    }
  }) as { data: UserContribution | undefined }

  const { writeContract } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: mintingState.txHash as `0x${string}`,
  })

  const claimVeNFTPosition = async () => {
    if (!userAddress) {
      setMintingState(prev => ({ 
        ...prev, 
        error: new Error('Wallet not connected') 
      }))
      return
    }

    if (!userContribution || userContribution.claimed) {
      setMintingState(prev => ({ 
        ...prev, 
        error: new Error('No unclaimed contribution found') 
      }))
      return
    }

    try {
      setMintingState(prev => ({ 
        ...prev, 
        isClaiming: true, 
        error: null 
      }))

      console.log('Claiming veNFT position for pool:', poolAddress)

      const txHash = await writeContract({
        ...getProratedPoolConfig(poolAddress),
        functionName: 'createVeNFTPosition',
        args: [],
      })

      console.log('veNFT claim transaction submitted:', txHash)

      // For now, generate a mock token ID
      // In a real implementation, we'd parse the transaction receipt for the actual token ID
      const mockTokenId = Math.floor(Math.random() * 10000) + 1

      setMintingState(prev => ({ 
        ...prev, 
        txHash,
        claimedTokenId: mockTokenId,
        isConfirming: true 
      }))

    } catch (error) {
      console.error('veNFT claiming failed:', error)
      setMintingState(prev => ({ 
        ...prev, 
        isClaiming: false,
        error: error as Error 
      }))
    }
  }

  // Update state based on transaction confirmation
  if (isSuccess && mintingState.isConfirming) {
    setMintingState(prev => ({ 
      ...prev, 
      isClaiming: false,
      isConfirming: false,
      isSuccess: true 
    }))
  }

  return {
    // State
    ...mintingState,
    isConfirming,
    userContribution,
    hasContribution: !!userContribution && userContribution.amount > 0n,
    hasUnclaimedContribution: !!userContribution && userContribution.amount > 0n && !userContribution.claimed,
    
    // Actions
    claimVeNFTPosition,
    
    // Reset function
    reset: () => setMintingState({
      isClaiming: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null,
      claimedTokenId: null
    })
  }
}

// Hook for managing existing veNFT positions
export function useVeNFTManagement(veNFTAddress: Address, tokenId: number) {
  const [managementState, setManagementState] = useState({
    isIncreasingAmount: false,
    isExtendingDuration: false,
    isWithdrawingDecayed: false,
    error: null as Error | null,
    txHash: null as string | null
  })

  const { writeContract } = useWriteContract()

  const increaseLockAmount = async (additionalAmount: bigint) => {
    try {
      setManagementState(prev => ({ ...prev, isIncreasingAmount: true, error: null }))

      const txHash = await writeContract({
        address: veNFTAddress,
        abi: [
          {
            inputs: [
              { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
              { internalType: 'uint256', name: '_value', type: 'uint256' }
            ],
            name: 'increaseLockAmount',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ],
        functionName: 'increaseLockAmount',
        args: [BigInt(tokenId), additionalAmount],
      })

      setManagementState(prev => ({ ...prev, txHash }))
    } catch (error) {
      setManagementState(prev => ({ 
        ...prev, 
        isIncreasingAmount: false,
        error: error as Error 
      }))
    }
  }

  const increaseLockDuration = async (newDuration: bigint) => {
    try {
      setManagementState(prev => ({ ...prev, isExtendingDuration: true, error: null }))

      const txHash = await writeContract({
        address: veNFTAddress,
        abi: [
          {
            inputs: [
              { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
              { internalType: 'uint256', name: '_newDuration', type: 'uint256' }
            ],
            name: 'increaseLockDuration',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ],
        functionName: 'increaseLockDuration',
        args: [BigInt(tokenId), newDuration],
      })

      setManagementState(prev => ({ ...prev, txHash }))
    } catch (error) {
      setManagementState(prev => ({ 
        ...prev, 
        isExtendingDuration: false,
        error: error as Error 
      }))
    }
  }

  const withdrawDecayed = async () => {
    try {
      setManagementState(prev => ({ ...prev, isWithdrawingDecayed: true, error: null }))

      const txHash = await writeContract({
        address: veNFTAddress,
        abi: [
          {
            inputs: [
              { internalType: 'uint256', name: '_tokenId', type: 'uint256' }
            ],
            name: 'withdrawDecayed',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function'
          }
        ],
        functionName: 'withdrawDecayed',
        args: [BigInt(tokenId)],
      })

      setManagementState(prev => ({ ...prev, txHash }))
    } catch (error) {
      setManagementState(prev => ({ 
        ...prev, 
        isWithdrawingDecayed: false,
        error: error as Error 
      }))
    }
  }

  return {
    ...managementState,
    increaseLockAmount,
    increaseLockDuration,
    withdrawDecayed
  }
}
