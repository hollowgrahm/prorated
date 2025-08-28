'use client'

import { useState, useCallback } from 'react'
import { Address, parseUnits, formatUnits } from 'viem'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts-config'
import { usePool } from './usePool'

export interface ProswapTradingState {
  isApproving: boolean
  isSwapping: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  txHash: string | null
  needsApproval: boolean
}

export interface TokenBalance {
  formatted: string
  value: bigint
}

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const PROSWAP_ROUTER_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'to', type: 'address' }
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'amountInMax', type: 'uint256' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'to', type: 'address' }
    ],
    name: 'swapTokensForExactTokens',
    outputs: [{ name: 'amountIn', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const

const PROSWAP_PAIR_ABI = [
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
  },
  {
    inputs: [],
    name: 'token80',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'token20',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

/**
 * Hook for real Proswap trading with proper approval flow and smart swap function selection
 */
export function useProswapTrading(projectAddress: Address) {
  const { address: userAddress } = useAccount()
  const [tradingState, setTradingState] = useState<ProswapTradingState>({
    isApproving: false,
    isSwapping: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    txHash: null,
    needsApproval: false
  })

  // Get pool data to access real contract addresses
  const { data: poolData } = usePool(projectAddress)

  // Check if this is the demo launched pool
  const isDemoPool = useCallback(() => {
    const launchedPoolAddress = (CONTRACT_ADDRESSES as Record<string, string>).launchedPool
    return launchedPoolAddress && projectAddress.toLowerCase() === launchedPoolAddress.toLowerCase()
  }, [projectAddress])

  // Get real contract addresses
  const tokenAddress = poolData?.proratedToken as Address
  const pairAddress = poolData?.proswapPair as Address
  const usdcAddress = (CONTRACT_ADDRESSES as Record<string, string>).mockUSDC as Address
  const routerAddress = (CONTRACT_ADDRESSES as Record<string, string>).proswapRouter as Address

  // Read PRO token balance
  const { data: proTokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && tokenAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && usdcAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  // Read pair reserves for price calculation
  const { data: pairReserves } = useReadContract({
    address: pairAddress,
    abi: PROSWAP_PAIR_ABI,
    functionName: 'getReserves',
    query: {
      enabled: Boolean(pairAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  // Read token ordering in pair
  const { data: token80Address } = useReadContract({
    address: pairAddress,
    abi: PROSWAP_PAIR_ABI,
    functionName: 'token80',
    query: {
      enabled: Boolean(pairAddress && isDemoPool())
    }
  })

  // Contract write hooks
  const { writeContract: writeApproval, data: approvalHash } = useWriteContract()
  const { writeContract: writeSwap, data: swapHash } = useWriteContract()
  
  const { isLoading: isApprovalConfirming } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })
  
  const { isLoading: isSwapConfirming, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({
    hash: swapHash,
  })

  // Format balances
  const proBalance: TokenBalance = {
    formatted: proTokenBalance ? formatUnits(proTokenBalance, 18) : '0',
    value: proTokenBalance || 0n
  }

  const usdcBalanceFormatted: TokenBalance = {
    formatted: usdcBalance ? formatUnits(usdcBalance, 6) : '0',
    value: usdcBalance || 0n
  }

  // Weighted math constants (matching Solidity)
  const WEIGHT_80 = 0.8 // 80% weight for token80 (PRO)
  const WEIGHT_20 = 0.2 // 20% weight for token20 (USDC)
  const LP_FEE = 0.003 // 0.3% LP fee

  // Helper function for weighted math calculations
  const computeOutGivenExactIn = useCallback((
    balanceIn: number,
    weightIn: number,
    balanceOut: number,
    weightOut: number,
    amountIn: number
  ): number => {
    // Balancer formula: amountOut = balanceOut * (1 - (balanceIn / (balanceIn + amountIn))^(weightIn / weightOut))
    const denominator = balanceIn + amountIn
    const base = balanceIn / denominator
    const exponent = weightIn / weightOut
    const power = Math.pow(base, exponent)
    const complement = 1 - power
    return balanceOut * complement
  }, [])

  const computeInGivenExactOut = useCallback((
    balanceIn: number,
    weightIn: number,
    balanceOut: number,
    weightOut: number,
    amountOut: number
  ): number => {
    // Balancer formula: amountIn = balanceIn * (((balanceOut / (balanceOut - amountOut))^(weightOut / weightIn)) - 1)
    const base = balanceOut / (balanceOut - amountOut)
    const exponent = weightOut / weightIn
    const power = Math.pow(base, exponent)
    const ratio = power - 1
    return balanceIn * ratio
  }, [])

  // Get current reserves for calculations
  const reserveData = (() => {
    if (!pairReserves || !token80Address) return null

    const [reserve0, reserve1] = pairReserves as readonly [bigint, bigint, number]
    
    // Determine which reserve is PRO (token80) and which is USDC (token20)
    const isProToken80 = token80Address.toLowerCase() === tokenAddress?.toLowerCase()
    const proReserve = isProToken80 ? reserve0 : reserve1
    const usdcReserve = isProToken80 ? reserve1 : reserve0

    if (proReserve === 0n || usdcReserve === 0n) return null

    // Convert to numbers for calculations (accounting for different decimals)
    const proReserveFormatted = Number(formatUnits(proReserve, 18))
    const usdcReserveFormatted = Number(formatUnits(usdcReserve, 6))

    return {
      proReserve: proReserveFormatted,
      usdcReserve: usdcReserveFormatted,
      isProToken80
    }
  })()

  // Read current allowances for both tokens
  const { data: proAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && routerAddress ? [userAddress, routerAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && tokenAddress && routerAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  const { data: usdcAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && routerAddress ? [userAddress, routerAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && usdcAddress && routerAddress && isDemoPool()),
      refetchInterval: 5000
    }
  })

  // Check if we have sufficient allowance for a specific amount
  const hasAllowance = useCallback((tokenAddr: Address, amount: string, decimals: number) => {
    if (!userAddress || !routerAddress) return false

    const allowance = tokenAddr.toLowerCase() === tokenAddress?.toLowerCase() ? proAllowance : usdcAllowance
    if (!allowance) return false

    const requiredAmount = parseUnits(amount, decimals)
    return allowance >= requiredAmount
  }, [userAddress, routerAddress, tokenAddress, proAllowance, usdcAllowance])

  // Approve token spending with max amount for better UX
  const approveToken = useCallback(async (tokenAddr: Address) => {
    if (!userAddress) {
      setTradingState(prev => ({ ...prev, error: new Error('Please connect your wallet') }))
      return false
    }

    try {
      setTradingState(prev => ({ ...prev, isApproving: true, error: null }))

      // Use max uint256 for unlimited approval (standard practice)
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') // 2^256 - 1
      
      await writeApproval({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [routerAddress, maxApproval]
      })

      return true
    } catch (error) {
      console.error('Approval failed:', error)
      setTradingState(prev => ({ 
        ...prev, 
        isApproving: false,
        error: new Error(`Failed to approve ${tokenAddr.toLowerCase() === tokenAddress?.toLowerCase() ? 'PRO' : 'USDC'} spending. Please try again.`)
      }))
      return false
    }
  }, [userAddress, routerAddress, writeApproval, tokenAddress])

  // Calculate output amount for exact input using weighted math
  const calculateOutputAmount = useCallback((inputAmount: string, fromToken: 'PRO' | 'USDC'): string => {
    if (!inputAmount || isNaN(parseFloat(inputAmount)) || !reserveData) return '0'

    const amountIn = parseFloat(inputAmount)
    if (amountIn <= 0) return '0'

    try {
      let amountOut: number

      if (fromToken === 'PRO') {
        // PRO -> USDC: PRO is token80 (0.8 weight), USDC is token20 (0.2 weight)
        const amountInWithFee = amountIn * (1 - LP_FEE) // Apply 0.3% fee
        amountOut = computeOutGivenExactIn(
          reserveData.proReserve,
          WEIGHT_80,
          reserveData.usdcReserve,
          WEIGHT_20,
          amountInWithFee
        )
      } else {
        // USDC -> PRO: USDC is token20 (0.2 weight), PRO is token80 (0.8 weight)
        const amountInWithFee = amountIn * (1 - LP_FEE) // Apply 0.3% fee
        amountOut = computeOutGivenExactIn(
          reserveData.usdcReserve,
          WEIGHT_20,
          reserveData.proReserve,
          WEIGHT_80,
          amountInWithFee
        )
      }

      return Math.max(0, amountOut).toFixed(6)
    } catch (error) {
      console.error('Error calculating output amount:', error)
      return '0'
    }
  }, [reserveData, computeOutGivenExactIn, LP_FEE, WEIGHT_80, WEIGHT_20])

  // Calculate input amount needed for exact output using weighted math
  const calculateInputAmount = useCallback((outputAmount: string, toToken: 'PRO' | 'USDC'): string => {
    if (!outputAmount || isNaN(parseFloat(outputAmount)) || !reserveData) return '0'

    const amountOut = parseFloat(outputAmount)
    if (amountOut <= 0) return '0'

    try {
      let amountInBeforeFee: number

      if (toToken === 'PRO') {
        // USDC -> PRO: USDC is token20 (0.2 weight), PRO is token80 (0.8 weight)
        amountInBeforeFee = computeInGivenExactOut(
          reserveData.usdcReserve,
          WEIGHT_20,
          reserveData.proReserve,
          WEIGHT_80,
          amountOut
        )
      } else {
        // PRO -> USDC: PRO is token80 (0.8 weight), USDC is token20 (0.2 weight)
        amountInBeforeFee = computeInGivenExactOut(
          reserveData.proReserve,
          WEIGHT_80,
          reserveData.usdcReserve,
          WEIGHT_20,
          amountOut
        )
      }

      // Add back the 0.3% fee: amountIn = amountInBeforeFee / (1 - fee)
      const amountIn = amountInBeforeFee / (1 - LP_FEE)
      
      return Math.max(0, amountIn).toFixed(6)
    } catch (error) {
      console.error('Error calculating input amount:', error)
      return '0'
    }
  }, [reserveData, computeInGivenExactOut, LP_FEE, WEIGHT_80, WEIGHT_20])

  // Execute swap with exact input amount
  const swapExactTokensForTokens = useCallback(async (
    inputAmount: string,
    outputAmount: string,
    fromToken: 'PRO' | 'USDC',
    slippageTolerance: number
  ) => {
    if (!userAddress || !isDemoPool()) {
      setTradingState(prev => ({ ...prev, error: new Error('Trading only available for launched projects') }))
      return
    }

    const fromTokenAddr = fromToken === 'PRO' ? tokenAddress : usdcAddress
    const toTokenAddr = fromToken === 'PRO' ? usdcAddress : tokenAddress
    const fromDecimals = fromToken === 'PRO' ? 18 : 6
    const toDecimals = fromToken === 'PRO' ? 6 : 18

    try {
      setTradingState(prev => ({ ...prev, isSwapping: true, error: null }))

      // Check and handle approval
      const hasCurrentAllowance = hasAllowance(fromTokenAddr, inputAmount, fromDecimals)
      if (!hasCurrentAllowance) {
        const approved = await approveToken(fromTokenAddr)
        if (!approved) return
      }

      // Calculate minimum output with slippage protection
      const expectedOutput = parseFloat(outputAmount)
      const minOutput = expectedOutput * (1 - slippageTolerance / 100)

      const amountIn = parseUnits(inputAmount, fromDecimals)
      const amountOutMin = parseUnits(minOutput.toString(), toDecimals)

      await writeSwap({
        address: routerAddress,
        abi: PROSWAP_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [amountIn, amountOutMin, fromTokenAddr, toTokenAddr, userAddress]
      })

      setTradingState(prev => ({ 
        ...prev, 
        isSwapping: false,
        isConfirming: true,
        txHash: swapHash || null
      }))

    } catch (error) {
      console.error('Swap failed:', error)
      setTradingState(prev => ({ 
        ...prev, 
        isSwapping: false,
        error: new Error('Swap failed. Please try again.')
      }))
    }
  }, [userAddress, tokenAddress, usdcAddress, routerAddress, hasAllowance, approveToken, writeSwap, swapHash, isDemoPool])

  // Execute swap with exact output amount
  const swapTokensForExactTokens = useCallback(async (
    inputAmount: string,
    outputAmount: string,
    fromToken: 'PRO' | 'USDC',
    slippageTolerance: number
  ) => {
    if (!userAddress || !isDemoPool()) {
      setTradingState(prev => ({ ...prev, error: new Error('Trading only available for launched projects') }))
      return
    }

    const fromTokenAddr = fromToken === 'PRO' ? tokenAddress : usdcAddress
    const toTokenAddr = fromToken === 'PRO' ? usdcAddress : tokenAddress
    const fromDecimals = fromToken === 'PRO' ? 18 : 6
    const toDecimals = fromToken === 'PRO' ? 6 : 18

    try {
      setTradingState(prev => ({ ...prev, isSwapping: true, error: null }))

      // Calculate maximum input with slippage protection
      const expectedInput = parseFloat(inputAmount)
      const maxInput = expectedInput * (1 + slippageTolerance / 100)

      // Check and handle approval for max input
      const hasCurrentAllowance = hasAllowance(fromTokenAddr, maxInput.toString(), fromDecimals)
      if (!hasCurrentAllowance) {
        const approved = await approveToken(fromTokenAddr)
        if (!approved) return
      }

      const amountOut = parseUnits(outputAmount, toDecimals)
      const amountInMax = parseUnits(maxInput.toString(), fromDecimals)

      await writeSwap({
        address: routerAddress,
        abi: PROSWAP_ROUTER_ABI,
        functionName: 'swapTokensForExactTokens',
        args: [amountOut, amountInMax, fromTokenAddr, toTokenAddr, userAddress]
      })

      setTradingState(prev => ({ 
        ...prev, 
        isSwapping: false,
        isConfirming: true,
        txHash: swapHash || null
      }))

    } catch (error) {
      console.error('Swap failed:', error)
      setTradingState(prev => ({ 
        ...prev, 
        isSwapping: false,
        error: new Error('Swap failed. Please try again.')
      }))
    }
  }, [userAddress, tokenAddress, usdcAddress, routerAddress, hasAllowance, approveToken, writeSwap, swapHash, isDemoPool])

  // Reset trading state
  const reset = useCallback(() => {
    setTradingState({
      isApproving: false,
      isSwapping: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null,
      needsApproval: false
    })
  }, [])

  // Update state based on transaction confirmations
  if (isSwapSuccess && tradingState.isConfirming) {
    setTradingState(prev => ({ 
      ...prev, 
      isConfirming: false,
      isSuccess: true 
    }))
  }

  if (isApprovalConfirming && tradingState.isApproving) {
    setTradingState(prev => ({ 
      ...prev, 
      isApproving: false
    }))
  }

  // Check if we need approval for current trade
  const needsApprovalForTrade = useCallback((fromToken: 'PRO' | 'USDC', amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) return false
    
    const fromTokenAddr = fromToken === 'PRO' ? tokenAddress : usdcAddress
    const fromDecimals = fromToken === 'PRO' ? 18 : 6
    
    return !hasAllowance(fromTokenAddr, amount, fromDecimals)
  }, [tokenAddress, usdcAddress, hasAllowance])

  return {
    // State
    ...tradingState,
    isConfirming: isSwapConfirming,
    isSuccess: isSwapSuccess,
    
    // Data
    proBalance,
    usdcBalance: usdcBalanceFormatted,
    reserveData,
    isDemoMode: isDemoPool(),
    
    // Approval status
    proAllowance: proAllowance || 0n,
    usdcAllowance: usdcAllowance || 0n,
    needsApprovalForTrade,
    
    // Contract addresses
    tokenAddress,
    pairAddress,
    usdcAddress,
    routerAddress,
    
    // Functions
    calculateOutputAmount,
    calculateInputAmount,
    swapExactTokensForTokens,
    swapTokensForExactTokens,
    approveToken,
    reset
  }
}
