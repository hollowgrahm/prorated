import { useAccount } from 'wagmi'
import { useFaucet } from './useFaucet'
// import { ProratedPoolABI } from '@/lib/contracts' // TODO: Import actual ABI

interface UserContribution {
  amount: number
  lockWeeks: number
  shares: number
  claimed: boolean
}

export function usePoolWithdrawal() {
  const { address: userAddress } = useAccount()
  const faucet = useFaucet()

  // Mock user contribution data - will be replaced with actual contract reads
  const userContribution: UserContribution = {
    amount: 10000, // Updated to match faucet amount
    lockWeeks: 52,
    shares: 520000, // 10000 * 52 weeks
    claimed: false
  }

  const claimRefund = async () => {
    if (!userAddress) {
      return
    }

    // For demo purposes, use the USDC faucet to simulate refund
    faucet.claimUSDC()
  }

  // Note: Transaction state is now handled by the faucet hook

  return {
    // Data
    userContribution,
    hasContribution: userContribution.amount > 0,
    
    // State - use faucet states for demo
    isWithdrawing: faucet.isLoading,
    isConfirming: faucet.isConfirming,
    isSuccess: faucet.success,
    error: faucet.error ? new Error(faucet.error) : null,
    txHash: faucet.hash,
    
    // Actions
    claimRefund,
    
    // Reset function (not needed for demo)
    reset: () => {}
  }
}

// Helper hook for checking pool withdrawal eligibility
export function usePoolWithdrawalEligibility() {
  // Mock data - will be replaced with actual contract reads
  const poolData = {
    hasEnded: true,
    hasReachedMinimum: false,
    totalContributions: 95000,
    minTotalContributions: 140000,
    endTime: Date.now() - 86400000 * 2 // 2 days ago
  }

  return {
    isEligibleForWithdrawal: poolData.hasEnded && !poolData.hasReachedMinimum,
    poolData
  }
}
