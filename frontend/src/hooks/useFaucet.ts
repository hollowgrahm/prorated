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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { writeContract, data: hash } = useWriteContract()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  const claimUSDC = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      const mockUSDCAddress = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS as `0x${string}`
      
      if (!mockUSDCAddress) {
        throw new Error('MockUSDC address not configured')
      }

      writeContract({
        address: mockUSDCAddress,
        abi: MOCK_USDC_ABI,
        functionName: 'faucet',
      })

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim USDC')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    claimUSDC,
    isLoading: isLoading || isConfirming,
    error,
    success,
    hash,
  }
}
