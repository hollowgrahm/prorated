// Contribution flow hooks with approval and contribution logic
import { useState, useMemo } from 'react'
import { Address } from 'viem'
import { useAccount } from 'wagmi'
import { 
  useUSDCBalance, 
  useUSDCAllowance, 
  useApproveToken, 
  useContributeToPool,
  useMintUSDC,
  useDeployToken,
  useDeployPair,
  useDeployLiquidity,
  useDeployVeNFT,
  useDeployGovernor,
  useDeployTreasury,
  useDeployProlend
} from './useContracts'
import { usePool } from './usePool'
import { parseContributionAmount } from '@/lib/utils'
import { CONTRACTS } from '@/lib/contracts'

export function useContribution(poolAddress: Address) {
  const { address: userAddress } = useAccount()
  const { data: poolData } = usePool(poolAddress)
  
  // Token balances and allowances
  const { data: usdcBalance } = useUSDCBalance(userAddress)
  const { data: allowance } = useUSDCAllowance(userAddress, poolAddress)
  
  // Transaction hooks
  const approveHook = useApproveToken()
  const contributeHook = useContributeToPool()
  const mintHook = useMintUSDC()
  
  // Contribution state
  const [contributionAmount, setContributionAmount] = useState('')
  const [lockDuration, setLockDuration] = useState(52) // Default to 1 year
  
  // Parse and validate contribution amount
  const parsedAmount = useMemo(() => {
    return parseContributionAmount(contributionAmount, 6) // USDC has 6 decimals
  }, [contributionAmount])
  
  // Check if user needs to approve more tokens
  const needsApproval = useMemo(() => {
    if (!parsedAmount.isValid || !allowance) return false
    return parsedAmount.amount > allowance
  }, [parsedAmount, allowance])
  
  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!parsedAmount.isValid || !usdcBalance) return false
    return parsedAmount.amount <= usdcBalance
  }, [parsedAmount, usdcBalance])
  
  // Check if pool is available for contribution
  const canContribute = useMemo(() => {
    if (!poolData || !userAddress) return false
    return poolData.status === 'active'
  }, [poolData, userAddress])
  
  // Validation state
  const validation = useMemo(() => {
    if (!userAddress) {
      return { isValid: false, error: 'Please connect your wallet' }
    }
    
    if (!canContribute) {
      return { isValid: false, error: 'Pool is not accepting contributions' }
    }
    
    if (!parsedAmount.isValid) {
      return { isValid: false, error: parsedAmount.error || 'Invalid amount' }
    }
    
    if (!hasSufficientBalance) {
      return { isValid: false, error: 'Insufficient USDC balance' }
    }
    
    if (lockDuration < 1 || lockDuration > 208) {
      return { isValid: false, error: 'Lock duration must be between 1 and 208 weeks' }
    }
    
    return { isValid: true, error: null }
  }, [userAddress, canContribute, parsedAmount, hasSufficientBalance, lockDuration])
  
  // Action functions
  const approveTokens = () => {
    if (!parsedAmount.isValid) return
    approveHook.approve(CONTRACTS.mockUSDC, poolAddress, parsedAmount.amount)
  }
  
  const contribute = () => {
    if (!validation.isValid || !parsedAmount.isValid) return
    contributeHook.contribute(poolAddress, parsedAmount.amount, lockDuration)
  }
  
  const mintUSDC = () => {
    if (!userAddress) return
    // Mint 10,000 USDC for testing
    const mintAmount = BigInt(10000 * 10**6)
    mintHook.mint(userAddress, mintAmount)
  }
  
  // Reset form after successful contribution
  const resetForm = () => {
    setContributionAmount('')
    setLockDuration(52)
  }
  
  // Overall transaction state
  const isTransacting = approveHook.isPending || contributeHook.isPending || mintHook.isPending
  const isConfirming = approveHook.isConfirming || contributeHook.isConfirming || mintHook.isConfirming
  
  return {
    // Form state
    contributionAmount,
    setContributionAmount,
    lockDuration,
    setLockDuration,
    
    // Parsed data
    parsedAmount,
    
    // Balances
    usdcBalance,
    allowance,
    
    // Validation
    validation,
    needsApproval,
    hasSufficientBalance,
    canContribute,
    
    // Actions
    approveTokens,
    contribute,
    mintUSDC,
    resetForm,
    
    // Transaction states
    isTransacting,
    isConfirming,
    
    // Individual transaction states
    approve: {
      isPending: approveHook.isPending,
      isConfirming: approveHook.isConfirming,
      isConfirmed: approveHook.isConfirmed,
      error: approveHook.error,
      hash: approveHook.hash,
    },
    
    contribution: {
      isPending: contributeHook.isPending,
      isConfirming: contributeHook.isConfirming,
      isConfirmed: contributeHook.isConfirmed,
      error: contributeHook.error,
      hash: contributeHook.hash,
    },
    
    mint: {
      isPending: mintHook.isPending,
      isConfirming: mintHook.isConfirming,
      isConfirmed: mintHook.isConfirmed,
      error: mintHook.error,
      hash: mintHook.hash,
    },
  }
}

// Hook for deployment workflow
export function useDeploymentWorkflow(poolAddress: Address) {
  const deployToken = useDeployToken()
  const deployPair = useDeployPair()
  const deployLiquidity = useDeployLiquidity()
  const deployVeNFT = useDeployVeNFT()
  const deployGovernor = useDeployGovernor()
  const deployTreasury = useDeployTreasury()
  const deployProlend = useDeployProlend()
  
  const deploymentSteps = [
    {
      id: 'token',
      name: 'Deploy Token',
      deploy: () => deployToken.deployToken(poolAddress),
      ...deployToken,
    },
    {
      id: 'pair',
      name: 'Deploy Pair',
      deploy: () => deployPair.deployPair(poolAddress),
      ...deployPair,
    },
    {
      id: 'liquidity',
      name: 'Seed Liquidity',
      deploy: () => deployLiquidity.deployLiquidity(poolAddress),
      ...deployLiquidity,
    },
    {
      id: 'venft',
      name: 'Deploy veNFT',
      deploy: () => deployVeNFT.deployVeNFT(poolAddress),
      ...deployVeNFT,
    },
    {
      id: 'governor',
      name: 'Deploy Governor',
      deploy: () => deployGovernor.deployGovernor(poolAddress),
      ...deployGovernor,
    },
    {
      id: 'treasury',
      name: 'Deploy Treasury',
      deploy: () => deployTreasury.deployTreasury(poolAddress),
      ...deployTreasury,
    },
    {
      id: 'prolend',
      name: 'Deploy Prolend',
      deploy: () => deployProlend.deployProlend(poolAddress),
      ...deployProlend,
    },
  ]
  
  const isAnyDeploying = deploymentSteps.some(step => step.isPending || step.isConfirming)
  
  return {
    steps: deploymentSteps,
    isAnyDeploying,
  }
}
