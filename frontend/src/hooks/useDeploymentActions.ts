'use client'

import { useWriteContract, useWaitForTransactionReceipt, useEstimateGas } from 'wagmi'
import { Address } from 'viem'
import { getProratedPoolConfig } from '@/lib/contracts'
import { useState, useCallback } from 'react'

export interface DeploymentActionResult {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  txHash: string | undefined
  execute: () => void
  reset: () => void
}

export interface GasEstimate {
  gasLimit: bigint | undefined
  gasPrice: bigint | undefined
  estimatedCost: string | undefined // In ETH
  isLoading: boolean
  error: Error | null
}

/**
 * Hook for deploying the token contract
 */
export function useDeployToken(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployToken',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for deploying the trading pair
 */
export function useDeployPair(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployPair',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for deploying liquidity
 */
export function useDeployLiquidity(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployLiquidity',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for deploying veNFT contract
 */
export function useDeployVeNFT(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployVeNFT',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for deploying governor contract
 */
export function useDeployGovernor(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployGovernor',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for deploying treasury contract
 */
export function useDeployTreasury(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployTreasury',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for deploying Prolend contracts
 */
export function useDeployProlend(poolAddress: Address): DeploymentActionResult {
  const { 
    writeContract, 
    data: txHash, 
    isLoading: isWriteLoading,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isTxLoading, 
    isSuccess, 
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const execute = useCallback(() => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployProlend',
    })
  }, [writeContract, poolAddress])

  return {
    isLoading: isWriteLoading || isTxLoading,
    isSuccess,
    isError: !!(writeError || txError),
    error: writeError || txError || null,
    txHash,
    execute,
    reset: resetWrite,
  }
}

/**
 * Hook for getting gas estimates for deployment functions
 */
export function useDeploymentGasEstimate(
  poolAddress: Address,
  functionName: 'deployToken' | 'deployPair' | 'deployLiquidity' | 'deployVeNFT' | 'deployGovernor' | 'deployTreasury' | 'deployProlend'
): GasEstimate {
  const [estimatedCost, setEstimatedCost] = useState<string>()

  const { 
    data: gasLimit, 
    isLoading,
    error 
  } = useEstimateGas({
    ...getProratedPoolConfig(poolAddress),
    functionName,
    query: {
      enabled: !!poolAddress,
    },
  })

  // Calculate estimated cost in ETH (assuming 20 gwei gas price)
  // This is a rough estimate - in production you'd want to fetch current gas prices
  if (gasLimit && !estimatedCost) {
    const gasPrice = BigInt(20e9) // 20 gwei
    const totalCost = gasLimit * gasPrice
    const costInEth = Number(totalCost) / 1e18
    setEstimatedCost(`~${costInEth.toFixed(4)} ETH`)
  }

  return {
    gasLimit,
    gasPrice: BigInt(20e9), // Mock 20 gwei
    estimatedCost,
    isLoading,
    error: error as Error | null,
  }
}

/**
 * Combined hook that provides all deployment actions
 */
export function useAllDeploymentActions(poolAddress: Address) {
  const deployToken = useDeployToken(poolAddress)
  const deployPair = useDeployPair(poolAddress)
  const deployLiquidity = useDeployLiquidity(poolAddress)
  const deployVeNFT = useDeployVeNFT(poolAddress)
  const deployGovernor = useDeployGovernor(poolAddress)
  const deployTreasury = useDeployTreasury(poolAddress)
  const deployProlend = useDeployProlend(poolAddress)

  return {
    token: deployToken,
    pair: deployPair,
    liquidity: deployLiquidity,
    venft: deployVeNFT,
    governor: deployGovernor,
    treasury: deployTreasury,
    prolend: deployProlend,
  }
}
