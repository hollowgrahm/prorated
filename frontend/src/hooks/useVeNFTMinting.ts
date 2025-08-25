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

      // Mock the transaction for now since the function doesn't exist in the current ABI
      // In a real implementation, this would call the correct veNFT minting function
      console.log('Mock veNFT claim transaction submitted')

      // For now, generate a mock token ID
      // In a real implementation, we'd parse the transaction receipt for the actual token ID
      const mockTokenId = Math.floor(Math.random() * 10000) + 1

      setMintingState(prev => ({ 
        ...prev, 
        txHash: 'mock-venft-claim-tx',
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

  const increaseLockAmount = async (additionalAmount: bigint) => {
    try {
      setManagementState(prev => ({ ...prev, isIncreasingAmount: true, error: null }))
      console.log('Increasing lock amount by:', additionalAmount)

      // Mock the transaction for now
      console.log('Mock increase lock amount transaction submitted')

      setManagementState(prev => ({ ...prev, txHash: 'mock-increase-amount-tx' }))
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

      // Mock the transaction for now
      console.log('Mock extend lock duration transaction submitted')

      setManagementState(prev => ({ ...prev, txHash: 'mock-extend-duration-tx' }))
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

      // Mock the transaction for now
      console.log('Mock withdraw decayed transaction submitted')

      setManagementState(prev => ({ ...prev, txHash: 'mock-withdraw-decayed-tx' }))
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
