import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { Address, parseEther } from 'viem'
import { proratedFactoryConfig } from '@/lib/contracts'
import { PoolCreationFormData } from '@/types/pool-creation'
import { toTokenUnits } from '@/lib/token-precision'

export interface PoolDeploymentResult {
  txHash: string
  poolAddress: string
}

export interface PoolDeploymentState {
  isDeploying: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  result: PoolDeploymentResult | null
}

export function usePoolDeployment() {
  const { address: userAddress } = useAccount()
  const [deploymentState, setDeploymentState] = useState<PoolDeploymentState>({
    isDeploying: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    result: null
  })

  const { writeContract } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: deploymentState.result?.txHash as `0x${string}`,
  })

  const deployPool = async (formData: PoolCreationFormData) => {
    if (!userAddress) {
      setDeploymentState(prev => ({ 
        ...prev, 
        error: new Error('Wallet not connected') 
      }))
      return
    }

    if (!formData.tokenName || !formData.tokenSymbol || !formData.tokenTotalSupply ||
        !formData.developmentFund || !formData.liquidityFund || !formData.fundingToken ||
        !formData.startTime || !formData.endTime || !formData.developerPercent ||
        !formData.treasuryPercent || !formData.daoPercent || !formData.salt) {
      setDeploymentState(prev => ({ 
        ...prev, 
        error: new Error('Missing required form data') 
      }))
      return
    }

    try {
      setDeploymentState(prev => ({ 
        ...prev, 
        isDeploying: true, 
        error: null 
      }))

      // Convert form data to contract parameters
      const poolConfig = {
        owner: userAddress,
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        tokenTotalSupply: toTokenUnits(formData.tokenTotalSupply), // Convert to 18 decimals
        developmentFund: parseEther(formData.developmentFund.toString()), // Convert to wei
        liquidityFund: parseEther(formData.liquidityFund.toString()), // Convert to wei
        startTime: BigInt(Math.floor(formData.startTime.getTime() / 1000)), // Convert to seconds
        endTime: BigInt(Math.floor(formData.endTime.getTime() / 1000)), // Convert to seconds
        fundingToken: formData.fundingToken as Address,
        developerPercent: BigInt(formData.developerPercent),
        treasuryPercent: BigInt(formData.treasuryPercent),
        daoPercent: BigInt(formData.daoPercent)
      }

      // Convert salt string to bytes32
      const saltBytes32 = formData.salt.startsWith('0x') 
        ? formData.salt as `0x${string}`
        : `0x${formData.salt}` as `0x${string}`

      console.log('Deploying pool with config:', poolConfig)
      console.log('Salt:', saltBytes32)

      const txHash = await writeContract({
        ...proratedFactoryConfig,
        functionName: 'createPool',
        args: [poolConfig, saltBytes32],
      })

      console.log('Pool deployment transaction submitted:', txHash)

      // For now, we'll generate a mock pool address
      // In a real implementation, we'd parse the transaction receipt for the actual address
      const mockPoolAddress = '0x' + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')

      setDeploymentState(prev => ({ 
        ...prev, 
        result: {
          txHash,
          poolAddress: mockPoolAddress
        },
        isConfirming: true 
      }))

    } catch (error) {
      console.error('Pool deployment failed:', error)
      setDeploymentState(prev => ({ 
        ...prev, 
        isDeploying: false,
        error: error as Error 
      }))
    }
  }

  // Update state based on transaction confirmation
  if (isSuccess && deploymentState.isConfirming) {
    setDeploymentState(prev => ({ 
      ...prev, 
      isDeploying: false,
      isConfirming: false,
      isSuccess: true 
    }))
  }

  return {
    // State
    ...deploymentState,
    isConfirming,
    
    // Actions
    deployPool,
    
    // Reset function
    reset: () => setDeploymentState({
      isDeploying: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      result: null
    })
  }
}

// Helper hook for validating pool deployment parameters
export function usePoolDeploymentValidation() {
  const validateDeploymentData = (formData: Partial<PoolCreationFormData>): string[] => {
    const errors: string[] = []

    if (!formData.tokenName?.trim()) {
      errors.push('Token name is required')
    }

    if (!formData.tokenSymbol?.trim()) {
      errors.push('Token symbol is required')
    }

    if (!formData.tokenTotalSupply || formData.tokenTotalSupply <= 0) {
      errors.push('Token total supply must be greater than 0')
    }

    if (!formData.developmentFund || formData.developmentFund <= 0) {
      errors.push('Development fund must be greater than 0')
    }

    if (!formData.liquidityFund || formData.liquidityFund <= 0) {
      errors.push('Liquidity fund must be greater than 0')
    }

    if (!formData.fundingToken) {
      errors.push('Funding token must be selected')
    }

    if (!formData.startTime) {
      errors.push('Start time is required')
    }

    if (!formData.endTime) {
      errors.push('End time is required')
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errors.push('End time must be after start time')
    }

    const totalPercent = (formData.developerPercent || 0) + 
                        (formData.treasuryPercent || 0) + 
                        (formData.daoPercent || 0)
    if (totalPercent !== 100) {
      errors.push('Allocation percentages must total 100%')
    }

    if (!formData.salt?.trim()) {
      errors.push('Deployment salt is required')
    }

    return errors
  }

  return { validateDeploymentData }
}
