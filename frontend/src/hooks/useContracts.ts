// Contract hooks using Wagmi for Prorated Protocol
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useEffect, useState } from 'react'
import { Address, createPublicClient, http } from 'viem'
import { anvilLocal } from '@/lib/wagmi'
import { env } from '@/lib/env'
import { 
  proratedFactoryConfig, 
  mockUSDCConfig,
  getProratedPoolConfig,
  getERC20Config,
  EXAMPLE_POOLS
} from '@/lib/contracts'

// Create a direct public client for testing
const publicClient = createPublicClient({
  chain: anvilLocal,
  transport: http(env.rpcUrl)
})

// Factory Contract Hooks - Using direct viem calls since Wagmi is stuck
export function useAllPoolsLength() {
  const [data, setData] = useState<bigint | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const fetchPoolCount = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const result = await publicClient.readContract({
          address: proratedFactoryConfig.address,
          abi: proratedFactoryConfig.abi,
          functionName: 'getPoolCount',
        })
        
        console.log('✅ Direct useAllPoolsLength result:', result)
        setData(result as bigint)
      } catch (err) {
        console.error('❌ Direct useAllPoolsLength error:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoolCount()
  }, [])

  const result = { data, isLoading, error, status: isLoading ? 'pending' : (error ? 'error' : 'success') }
  return result
}

export function useAllPools(index: number) {
  const [data, setData] = useState<Address | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || index < 0) {
      setIsLoading(false)
      return
    }

    const fetchPoolAddress = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const result = await publicClient.readContract({
          address: proratedFactoryConfig.address,
          abi: proratedFactoryConfig.abi,
          functionName: 'allPools',
          args: [BigInt(index)],
        })
        
        console.log(`✅ Direct useAllPools(${index}) result:`, result)
        setData(result as Address)
      } catch (err) {
        console.error(`❌ Direct useAllPools(${index}) error:`, err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoolAddress()
  }, [index])

  return { data, isLoading, error }
}

export function usePoolExists(poolAddress: Address) {
  return useReadContract({
    ...proratedFactoryConfig,
    functionName: 'poolExists',
    args: [poolAddress],
    query: {
      enabled: !!poolAddress,
    },
  })
}

// Pool Contract Hooks
export function usePoolData(poolAddress: Address) {
  return useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'getPoolData',
    query: {
      enabled: !!poolAddress,
    },
  })
}

export function usePoolTotalContributions(poolAddress: Address) {
  return useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'totalContributions',
    query: {
      enabled: !!poolAddress,
    },
  })
}

export function usePoolTotalShares(poolAddress: Address) {
  return useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'totalShares',
    query: {
      enabled: !!poolAddress,
    },
  })
}

export function usePoolMinContributions(poolAddress: Address) {
  return useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'minTotalContributions',
    query: {
      enabled: !!poolAddress,
    },
  })
}

export function usePoolHasReachedMinimum(poolAddress: Address) {
  return useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'hasReachedMinimum',
    query: {
      enabled: !!poolAddress,
    },
  })
}

export function useUserContribution(poolAddress: Address, userAddress?: Address) {
  return useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'getUserContribution',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!poolAddress && !!userAddress,
    },
  })
}

// ERC20 Token Hooks
export function useTokenBalance(tokenAddress: Address, userAddress?: Address) {
  return useReadContract({
    ...getERC20Config(tokenAddress),
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
    },
  })
}

export function useTokenAllowance(tokenAddress: Address, owner?: Address, spender?: Address) {
  return useReadContract({
    ...getERC20Config(tokenAddress),
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!tokenAddress && !!owner && !!spender,
    },
  })
}

export function useTokenInfo(tokenAddress: Address) {
  const name = useReadContract({
    ...getERC20Config(tokenAddress),
    functionName: 'name',
    query: { enabled: !!tokenAddress },
  })
  
  const symbol = useReadContract({
    ...getERC20Config(tokenAddress),
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  })
  
  const decimals = useReadContract({
    ...getERC20Config(tokenAddress),
    functionName: 'decimals',
    query: { enabled: !!tokenAddress },
  })
  
  const totalSupply = useReadContract({
    ...getERC20Config(tokenAddress),
    functionName: 'totalSupply',
    query: { enabled: !!tokenAddress },
  })

  return {
    name: name.data,
    symbol: symbol.data,
    decimals: decimals.data,
    totalSupply: totalSupply.data,
    isLoading: name.isLoading || symbol.isLoading || decimals.isLoading || totalSupply.isLoading,
    error: name.error || symbol.error || decimals.error || totalSupply.error,
  }
}

// Mock USDC specific hooks
export function useUSDCBalance(userAddress?: Address) {
  return useTokenBalance(mockUSDCConfig.address, userAddress)
}

export function useUSDCAllowance(owner?: Address, spender?: Address) {
  return useTokenAllowance(mockUSDCConfig.address, owner, spender)
}

// Write Contract Hooks (for transactions)
export function useContributeToPool() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const contribute = (poolAddress: Address, amount: bigint, lockDuration: number) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'contribute',
      args: [amount, BigInt(lockDuration)],
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    contribute,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useApproveToken() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const approve = (tokenAddress: Address, spender: Address, amount: bigint) => {
    writeContract({
      ...getERC20Config(tokenAddress),
      functionName: 'approve',
      args: [spender, amount],
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    approve,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useMintUSDC() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const mint = (to: Address, amount: bigint) => {
    writeContract({
      ...mockUSDCConfig,
      functionName: 'mint',
      args: [to, amount],
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    mint,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

// Deployment Hooks (for successful pools)
export function useDeployToken() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployToken = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployToken',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployToken,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useDeployPair() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployPair = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployPair',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployPair,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useDeployLiquidity() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployLiquidity = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployLiquidity',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployLiquidity,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useDeployVeNFT() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployVeNFT = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployVeNFT',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployVeNFT,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useDeployGovernor() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployGovernor = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployGovernor',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployGovernor,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useDeployTreasury() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployTreasury = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployTreasury',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployTreasury,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

export function useDeployProlend() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()
  
  const deployProlend = (poolAddress: Address) => {
    writeContract({
      ...getProratedPoolConfig(poolAddress),
      functionName: 'deployProlend',
    })
  }
  
  const receipt = useWaitForTransactionReceipt({ hash })
  
  return {
    deployProlend,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: error || receipt.error,
  }
}

// Convenience hooks for example pools
export function useActivePoolData() {
  return usePoolData(EXAMPLE_POOLS.activePool as Address)
}

export function useUpcomingPoolData() {
  return usePoolData(EXAMPLE_POOLS.upcomingPool as Address)
}

export function useSuccessfulPoolData() {
  return usePoolData(EXAMPLE_POOLS.successfulPool as Address)
}

export function useEndedSuccessfulPoolData() {
  return usePoolData(EXAMPLE_POOLS.endedSuccessfulPool as Address)
}
