'use client'

import { useState, useCallback, useEffect } from 'react'
import { Address } from 'viem'

export interface DemoDeploymentState {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: Error | null
  txHash: string | null
  address: string | null
}

export interface DemoDeploymentResult extends DemoDeploymentState {
  execute: () => void
  reset: () => void
}

// Generate realistic mock addresses and transaction hashes
const generateMockAddress = (): Address => {
  const chars = '0123456789abcdef'
  let result = '0x'
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result as Address
}

const generateMockTxHash = (): string => {
  const chars = '0123456789abcdef'
  let result = '0x'
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Simulate deployment delays (realistic timing)
const DEPLOYMENT_DELAYS = {
  token: 3000,      // 3 seconds
  pair: 4000,       // 4 seconds  
  liquidity: 5000,  // 5 seconds
  venft: 4500,      // 4.5 seconds
  governor: 3500,   // 3.5 seconds
  treasury: 3000,   // 3 seconds
  prolend: 6000,    // 6 seconds (most complex)
}

// Demo deployment state storage
const DEMO_STORAGE_KEY = 'prorated-demo-deployments'

interface DemoDeploymentStorage {
  [poolAddress: string]: {
    [stepId: string]: {
      address: string
      txHash: string
      timestamp: number
    }
  }
}

const getDemoStorage = (): DemoDeploymentStorage => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

const setDemoStorage = (data: DemoDeploymentStorage) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore storage errors
  }
}

const saveDemoDeployment = (poolAddress: string, stepId: string, address: string, txHash: string) => {
  const storage = getDemoStorage()
  if (!storage[poolAddress]) {
    storage[poolAddress] = {}
  }
  storage[poolAddress][stepId] = {
    address,
    txHash,
    timestamp: Date.now()
  }
  setDemoStorage(storage)
}

const getDemoDeployment = (poolAddress: string, stepId: string) => {
  const storage = getDemoStorage()
  return storage[poolAddress]?.[stepId] || null
}

/**
 * Demo deployment hook that simulates real deployment with realistic timing
 */
export function useDemoDeployment(
  poolAddress: Address,
  stepId: keyof typeof DEPLOYMENT_DELAYS
): DemoDeploymentResult {
  const [state, setState] = useState<DemoDeploymentState>(() => {
    // Check if this deployment already exists in demo storage
    const existing = getDemoDeployment(poolAddress, stepId)
    if (existing) {
      return {
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        txHash: existing.txHash,
        address: existing.address,
      }
    }
    
    return {
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: null,
      address: null,
    }
  })

  const execute = useCallback(() => {
    // Don't re-deploy if already successful
    if (state.isSuccess) return

    setState(prev => ({
      ...prev,
      isLoading: true,
      isError: false,
      error: null,
    }))

    // Simulate deployment with realistic delay
    const delay = DEPLOYMENT_DELAYS[stepId]
    
    setTimeout(() => {
      // 95% success rate (occasionally simulate failures for realism)
      const shouldSucceed = Math.random() > 0.05

      if (shouldSucceed) {
        const mockAddress = generateMockAddress()
        const mockTxHash = generateMockTxHash()

        // Save to demo storage
        saveDemoDeployment(poolAddress, stepId, mockAddress, mockTxHash)

        setState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: true,
          txHash: mockTxHash,
          address: mockAddress,
        }))
      } else {
        // Simulate failure
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: new Error(`Demo deployment failed for ${stepId}. This is a simulated failure - try again!`),
        }))
      }
    }, delay)
  }, [poolAddress, stepId, state.isSuccess])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: null,
      address: null,
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

/**
 * Get all demo deployment statuses for a pool
 */
export function useDemoDeploymentStatus(poolAddress: Address) {
  const [deployments, setDeployments] = useState<{[stepId: string]: { address: string; txHash: string; timestamp: number }}>(() => {
    // Initialize with current storage state
    const storage = getDemoStorage()
    return storage[poolAddress] || {}
  })

  useEffect(() => {
    const storage = getDemoStorage()
    const poolDeployments = storage[poolAddress] || {}
    setDeployments(poolDeployments)
  }, [poolAddress])

  const refreshDeployments = useCallback(() => {
    const storage = getDemoStorage()
    const poolDeployments = storage[poolAddress] || {}
    setDeployments(poolDeployments)
  }, [poolAddress])

  return {
    deployments,
    refreshDeployments,
    hasDeployment: useCallback((stepId: string) => !!deployments[stepId], [deployments]),
    getDeployment: useCallback((stepId: string) => deployments[stepId] || null, [deployments]),
  }
}

/**
 * Combined demo deployment actions for all steps
 */
export function useAllDemoDeploymentActions(poolAddress: Address) {
  const token = useDemoDeployment(poolAddress, 'token')
  const pair = useDemoDeployment(poolAddress, 'pair')
  const liquidity = useDemoDeployment(poolAddress, 'liquidity')
  const venft = useDemoDeployment(poolAddress, 'venft')
  const governor = useDemoDeployment(poolAddress, 'governor')
  const treasury = useDemoDeployment(poolAddress, 'treasury')
  const prolend = useDemoDeployment(poolAddress, 'prolend')

  return {
    token,
    pair,
    liquidity,
    venft,
    governor,
    treasury,
    prolend,
  }
}

/**
 * Clear all demo deployments for a pool (useful for testing)
 */
export function clearDemoDeployments(poolAddress: string) {
  const storage = getDemoStorage()
  delete storage[poolAddress]
  setDemoStorage(storage)
}
