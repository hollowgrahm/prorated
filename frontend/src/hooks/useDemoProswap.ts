'use client'

import { useState } from 'react'
import { Address, formatUnits } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts-config'
import { usePool } from './usePool'
import { useFaucet } from './useFaucet'

export interface DemoProswapState {
  isSwapping: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  txHash: string | null
}

export interface TokenBalance {
  formatted: string
  value: bigint
}

/**
 * Demo hook for Proswap trading that connects to real contracts for launched pools
 */
export function useDemoProswap(projectAddress: Address) {
  const { address: userAddress } = useAccount()
  const [swapState, setSwapState] = useState<DemoProswapState>({
    isSwapping: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    txHash: null
  })

  // Get pool data to access real contract addresses
  const { data: poolData } = usePool(projectAddress)
  const faucet = useFaucet()

  // Check if this is the demo launched pool
  const isDemoPool = () => {
    const launchedPoolAddress = (CONTRACT_ADDRESSES as Record<string, string>).launchedPool
    return launchedPoolAddress && projectAddress.toLowerCase() === launchedPoolAddress.toLowerCase()
  }

  // Get real contract addresses for launched pool
  const tokenAddress = poolData?.proratedToken
  const pairAddress = poolData?.proswapPair
  const usdcAddress = (CONTRACT_ADDRESSES as Record<string, string>).mockUSDC

  // Read PRO token balance
  const { data: proTokenBalance } = useReadContract({
    address: tokenAddress as Address,
    abi: [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && tokenAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as Address,
    abi: [
      {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && usdcAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  // Read pair reserves (for price calculation)
  const { data: pairReserves } = useReadContract({
    address: pairAddress as Address,
    abi: [
      {
        inputs: [],
        name: 'getReserves',
        outputs: [
          { name: 'reserve0', type: 'uint256' },
          { name: 'reserve1', type: 'uint256' },
          { name: 'blockTimestampLast', type: 'uint32' }
        ],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'getReserves',
    query: {
      enabled: Boolean(pairAddress && isDemoPool()),
      refetchInterval: 10000
    }
  })

  // Format balances
  const proBalance: TokenBalance = {
    formatted: proTokenBalance ? formatUnits(proTokenBalance as bigint, 18) : '0',
    value: (proTokenBalance as bigint) || 0n
  }

  const usdcBalanceFormatted: TokenBalance = {
    formatted: usdcBalance ? formatUnits(usdcBalance as bigint, 6) : '0',
    value: (usdcBalance as bigint) || 0n
  }

  // Calculate exchange rate from reserves
  const exchangeRate = pairReserves ? {
    proToUsdc: Number(formatUnits((pairReserves as readonly [bigint, bigint, number])[1], 6)) / Number(formatUnits((pairReserves as readonly [bigint, bigint, number])[0], 18)),
    usdcToPro: Number(formatUnits((pairReserves as readonly [bigint, bigint, number])[0], 18)) / Number(formatUnits((pairReserves as readonly [bigint, bigint, number])[1], 6))
  } : { proToUsdc: 1.5, usdcToPro: 0.67 } // Mock rates

  // Debug logging for exchange rates
  if (isDemoPool() && pairReserves) {
    console.log('🔄 Real Exchange Rates from Reserves:', {
      proReserve: formatUnits((pairReserves as readonly [bigint, bigint, number])[0], 18),
      usdcReserve: formatUnits((pairReserves as readonly [bigint, bigint, number])[1], 6),
      proToUsdc: exchangeRate.proToUsdc,
      usdcToPro: exchangeRate.usdcToPro
    })
  }

  // Simulate swap (for demo purposes - real implementation would use router contract)
  const simulateSwap = async (fromToken: 'PRO' | 'USDC', amount: string) => {
    if (!userAddress || !isDemoPool()) {
      setSwapState(prev => ({ 
        ...prev, 
        error: new Error('Demo trading only available for Prorated Protocol') 
      }))
      return
    }

    try {
      setSwapState(prev => ({ 
        ...prev, 
        isSwapping: true, 
        error: null 
      }))

      console.log('🎭 Demo: Simulating swap of', amount, fromToken)

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66).padStart(64, '0')}`

      setSwapState(prev => ({ 
        ...prev, 
        txHash: mockTxHash,
        isConfirming: true 
      }))

      // Simulate confirmation delay
      setTimeout(() => {
        setSwapState(prev => ({ 
          ...prev, 
          isSwapping: false,
          isConfirming: false,
          isSuccess: true 
        }))
      }, 3000)

    } catch (error) {
      console.error('Demo swap failed:', error)
      setSwapState(prev => ({ 
        ...prev, 
        isSwapping: false,
        error: error as Error 
      }))
    }
  }

  // Calculate output amount for a given input
  const calculateOutputAmount = (inputAmount: string, fromToken: 'PRO' | 'USDC'): string => {
    if (!inputAmount || isNaN(parseFloat(inputAmount))) return '0'
    
    const amount = parseFloat(inputAmount)
    if (fromToken === 'PRO') {
      return (amount * exchangeRate.proToUsdc).toFixed(6)
    } else {
      return (amount * exchangeRate.usdcToPro).toFixed(6)
    }
  }

  return {
    // State
    ...swapState,
    isDemoMode: isDemoPool(),
    
    // Balances
    proBalance,
    usdcBalance: usdcBalanceFormatted,
    
    // Contract addresses
    tokenAddress,
    pairAddress,
    usdcAddress,
    
    // Exchange rates
    exchangeRate,
    
    // Actions
    simulateSwap,
    calculateOutputAmount,
    
    // Faucet integration
    faucet,
    
    // Reset function
    reset: () => setSwapState({
      isSwapping: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null
    })
  }
}
