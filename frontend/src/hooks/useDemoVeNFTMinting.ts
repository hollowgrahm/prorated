'use client'

import { useState } from 'react'
import { Address } from 'viem'
import { useAccount } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts-config'

export interface DemoVeNFTMintingState {
  isClaiming: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  txHash: string | null
  claimedTokenId: number | null
}

export interface DemoUserContribution {
  amount: bigint
  lockDuration: bigint
  shares: bigint
  claimed: boolean
}

/**
 * Demo hook for veNFT minting that simulates the process for launched pools
 */
export function useDemoVeNFTMinting(poolAddress: Address) {
  const { address: userAddress } = useAccount()
  const [mintingState, setMintingState] = useState<DemoVeNFTMintingState>({
    isClaiming: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    txHash: null,
    claimedTokenId: null
  })

  // Check if this is a demo pool (launched Prorated Protocol pool)
  const isDemoPool = () => {
    const launchedPoolAddress = (CONTRACT_ADDRESSES as Record<string, string>).launchedPool
    return launchedPoolAddress && poolAddress.toLowerCase() === launchedPoolAddress.toLowerCase()
  }

  // Mock user contribution for demo purposes
  const mockUserContribution: DemoUserContribution = {
    amount: BigInt(10000 * 10**6), // 10,000 USDC (6 decimals)
    lockDuration: BigInt(52), // 52 weeks
    shares: BigInt(520000), // 10,000 * 52 = 520,000 shares
    claimed: false
  }

  // For demo pools, show mock contribution unless already claimed
  const userContribution = isDemoPool() ? {
    ...mockUserContribution,
    claimed: mintingState.isSuccess // Mark as claimed if demo was successful
  } : null
  const hasContribution = !!userContribution && userContribution.amount > 0n
  const hasUnclaimedContribution = hasContribution && !userContribution.claimed

  const claimVeNFTPosition = async () => {
    if (!userAddress) {
      setMintingState(prev => ({ 
        ...prev, 
        error: new Error('Wallet not connected') 
      }))
      return
    }

    if (!isDemoPool()) {
      setMintingState(prev => ({ 
        ...prev, 
        error: new Error('Demo veNFT minting only available for Prorated Protocol pool') 
      }))
      return
    }

    try {
      setMintingState(prev => ({ 
        ...prev, 
        isClaiming: true, 
        error: null 
      }))

      console.log('🎭 Demo: Simulating veNFT position creation for pool:', poolAddress)

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate mock transaction hash and token ID
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`
      const mockTokenId = Math.floor(Math.random() * 1000) + 1

      setMintingState(prev => ({ 
        ...prev, 
        txHash: mockTxHash,
        claimedTokenId: mockTokenId,
        isConfirming: true 
      }))

      // Simulate confirmation delay
      setTimeout(() => {
        setMintingState(prev => ({ 
          ...prev, 
          isClaiming: false,
          isConfirming: false,
          isSuccess: true 
        }))
      }, 3000)

    } catch (error) {
      console.error('Demo veNFT claiming failed:', error)
      setMintingState(prev => ({ 
        ...prev, 
        isClaiming: false,
        error: error as Error 
      }))
    }
  }

  return {
    // State
    ...mintingState,
    userContribution,
    hasContribution,
    hasUnclaimedContribution,
    isDemoMode: isDemoPool(),
    
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
    }),
    
    // Demo-specific reset function
    resetDemo: () => {
      console.log('🎭 Demo: Resetting veNFT demo for another try')
      setMintingState({
        isClaiming: false,
        isConfirming: false,
        isSuccess: false,
        error: null,
        txHash: null,
        claimedTokenId: null
      })
    }
  }
}

/**
 * Demo hook for managing existing veNFT positions
 */
export function useDemoVeNFTManagement(veNFTAddress: Address, tokenId: number) {
  const [managementState, setManagementState] = useState({
    isIncreasingAmount: false,
    isExtendingDuration: false,
    isWithdrawingDecayed: false,
    error: null as Error | null,
    txHash: null as string | null
  })

  const simulateTransaction = async (action: string) => {
    console.log(`🎭 Demo: Simulating ${action} for veNFT token ${tokenId}`)
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate mock transaction hash
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`
    
    setManagementState(prev => ({ ...prev, txHash: mockTxHash }))
    
    // Simulate confirmation
    setTimeout(() => {
      setManagementState({
        isIncreasingAmount: false,
        isExtendingDuration: false,
        isWithdrawingDecayed: false,
        error: null,
        txHash: null
      })
    }, 3000)
  }

  const increaseLockAmount = async (_additionalAmount: bigint) => {
    try {
      setManagementState(prev => ({ ...prev, isIncreasingAmount: true, error: null }))
      await simulateTransaction('increase lock amount')
    } catch (error) {
      setManagementState(prev => ({ 
        ...prev, 
        isIncreasingAmount: false,
        error: error as Error 
      }))
    }
  }

  const increaseLockDuration = async (_newDuration: bigint) => {
    try {
      setManagementState(prev => ({ ...prev, isExtendingDuration: true, error: null }))
      await simulateTransaction('increase lock duration')
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
      await simulateTransaction('withdraw decayed tokens')
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
    withdrawDecayed,
    isDemoMode: true
  }
}
