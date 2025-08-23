import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from 'wagmi'
import { Address, encodeFunctionData } from 'viem'

export interface ProposalCreationData {
  target: Address
  functionName: string
  args: any[]
  description: string
}

export interface GovernanceState {
  isCreatingProposal: boolean
  isVoting: boolean
  isExecuting: boolean
  isConfirming: boolean
  isSuccess: boolean
  error: Error | null
  txHash: string | null
  createdProposalId: number | null
}

// ABI for common governance functions
const GOVERNANCE_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'target', type: 'address' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
      { internalType: 'string', name: 'description', type: 'string' }
    ],
    name: 'createProposal',
    outputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'bool', name: 'support', type: 'bool' }
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' }
    ],
    name: 'state',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'proposalCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export function useGovernance(governorAddress: Address) {
  const { address: userAddress } = useAccount()
  const [governanceState, setGovernanceState] = useState<GovernanceState>({
    isCreatingProposal: false,
    isVoting: false,
    isExecuting: false,
    isConfirming: false,
    isSuccess: false,
    error: null,
    txHash: null,
    createdProposalId: null
  })

  const { writeContract } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: governanceState.txHash as `0x${string}`,
  })

  // Read proposal count
  const { data: proposalCount } = useReadContract({
    address: governorAddress,
    abi: GOVERNANCE_ABI,
    functionName: 'proposalCount',
  })

  const createProposal = async (proposalData: ProposalCreationData) => {
    if (!userAddress) {
      setGovernanceState(prev => ({ 
        ...prev, 
        error: new Error('Wallet not connected') 
      }))
      return
    }

    try {
      setGovernanceState(prev => ({ 
        ...prev, 
        isCreatingProposal: true, 
        error: null 
      }))

      // Encode the function call data
      let callData: `0x${string}`
      
      if (proposalData.functionName && proposalData.args) {
        // For specific function calls, we'd need the target contract ABI
        // For now, we'll create a simple encoded call
        callData = encodeFunctionData({
          abi: [
            {
              inputs: proposalData.args.map((_, i) => ({ 
                internalType: 'uint256', 
                name: `arg${i}`, 
                type: 'uint256' 
              })),
              name: proposalData.functionName,
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function'
            }
          ],
          functionName: proposalData.functionName,
          args: proposalData.args
        })
      } else {
        // Empty call data for simple proposals
        callData = '0x'
      }

      console.log('Creating proposal:', {
        target: proposalData.target,
        callData,
        description: proposalData.description
      })

      const txHash = await writeContract({
        address: governorAddress,
        abi: GOVERNANCE_ABI,
        functionName: 'createProposal',
        args: [proposalData.target, callData, proposalData.description],
      })

      console.log('Proposal creation transaction submitted:', txHash)

      // Mock proposal ID for demo
      const mockProposalId = Number(proposalCount || 0) + 1

      setGovernanceState(prev => ({ 
        ...prev, 
        txHash,
        createdProposalId: mockProposalId,
        isConfirming: true 
      }))

    } catch (error) {
      console.error('Proposal creation failed:', error)
      setGovernanceState(prev => ({ 
        ...prev, 
        isCreatingProposal: false,
        error: error as Error 
      }))
    }
  }

  const vote = async (proposalId: number, tokenId: number, support: boolean) => {
    if (!userAddress) {
      setGovernanceState(prev => ({ 
        ...prev, 
        error: new Error('Wallet not connected') 
      }))
      return
    }

    try {
      setGovernanceState(prev => ({ 
        ...prev, 
        isVoting: true, 
        error: null 
      }))

      console.log('Voting on proposal:', { proposalId, tokenId, support })

      const txHash = await writeContract({
        address: governorAddress,
        abi: GOVERNANCE_ABI,
        functionName: 'vote',
        args: [BigInt(proposalId), BigInt(tokenId), support],
      })

      console.log('Vote transaction submitted:', txHash)

      setGovernanceState(prev => ({ 
        ...prev, 
        txHash,
        isConfirming: true 
      }))

    } catch (error) {
      console.error('Voting failed:', error)
      setGovernanceState(prev => ({ 
        ...prev, 
        isVoting: false,
        error: error as Error 
      }))
    }
  }

  const executeProposal = async (proposalId: number) => {
    if (!userAddress) {
      setGovernanceState(prev => ({ 
        ...prev, 
        error: new Error('Wallet not connected') 
      }))
      return
    }

    try {
      setGovernanceState(prev => ({ 
        ...prev, 
        isExecuting: true, 
        error: null 
      }))

      console.log('Executing proposal:', proposalId)

      const txHash = await writeContract({
        address: governorAddress,
        abi: GOVERNANCE_ABI,
        functionName: 'execute',
        args: [BigInt(proposalId)],
      })

      console.log('Execution transaction submitted:', txHash)

      setGovernanceState(prev => ({ 
        ...prev, 
        txHash,
        isConfirming: true 
      }))

    } catch (error) {
      console.error('Proposal execution failed:', error)
      setGovernanceState(prev => ({ 
        ...prev, 
        isExecuting: false,
        error: error as Error 
      }))
    }
  }

  // Update state based on transaction confirmation
  if (isSuccess && governanceState.isConfirming) {
    setGovernanceState(prev => ({ 
      ...prev, 
      isCreatingProposal: false,
      isVoting: false,
      isExecuting: false,
      isConfirming: false,
      isSuccess: true 
    }))
  }

  return {
    // State
    ...governanceState,
    isConfirming,
    proposalCount: Number(proposalCount || 0),
    
    // Actions
    createProposal,
    vote,
    executeProposal,
    
    // Reset function
    reset: () => setGovernanceState({
      isCreatingProposal: false,
      isVoting: false,
      isExecuting: false,
      isConfirming: false,
      isSuccess: false,
      error: null,
      txHash: null,
      createdProposalId: null
    })
  }
}

// Helper function to get proposal state names
export function getProposalStateName(state: number): string {
  const states = ['Pending', 'Active', 'Defeated', 'Succeeded', 'Executed', 'Canceled']
  return states[state] || 'Unknown'
}

// Common proposal templates
export const PROPOSAL_TEMPLATES = {
  treasuryFunding: {
    title: 'Treasury Funding Request',
    description: 'Request funding from the treasury for development or operations',
    functionName: 'transfer',
    targetType: 'treasury'
  },
  parameterChange: {
    title: 'Protocol Parameter Update',
    description: 'Update protocol parameters such as fees or limits',
    functionName: 'updateParameter',
    targetType: 'protocol'
  },
  contractUpgrade: {
    title: 'Contract Upgrade',
    description: 'Upgrade protocol contracts to new implementations',
    functionName: 'upgrade',
    targetType: 'protocol'
  }
}
