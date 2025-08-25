'use client'

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState } from 'react'

const MOCK_USDC_ABI = [
  {
    name: 'faucet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

export function useFaucet() {
  const [error, setError] = useState<string | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const claimUSDC = async () => {
    try {
      setError(null)

      const mockUSDCAddress = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS as `0x${string}`
      
      if (!mockUSDCAddress) {
        throw new Error('MockUSDC address not configured')
      }

      writeContract({
        address: mockUSDCAddress,
        abi: MOCK_USDC_ABI,
        functionName: 'faucet',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim USDC')
    }
  }

  return {
    claimUSDC,
    isLoading: isPending,
    isConfirming,
    error: error || writeError?.message,
    success: isConfirmed,
    hash,
  }
}
