'use client'

import { useAccount, useReadContract } from 'wagmi'
import { Address } from 'viem'
import { mockUSDCConfig } from '@/lib/contracts'
import { formatUSD } from '@/lib/utils'

export function BalanceDebug() {
  const { address: userAddress, isConnected, chainId } = useAccount()
  
  const { data: balance, isLoading, error, queryKey } = useReadContract({
    ...mockUSDCConfig,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && isConnected,
    },
  })

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <h3 className="font-medium text-yellow-400">Balance Debug - Not Connected</h3>
        <p className="text-sm text-muted-foreground">Please connect your wallet</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
      <h3 className="font-medium text-blue-400">Balance Debug</h3>
      <div className="mt-2 space-y-1 text-sm">
        <p><strong>Address:</strong> {userAddress}</p>
        <p><strong>Chain ID:</strong> {chainId}</p>
        <p><strong>MockUSDC:</strong> {mockUSDCConfig.address}</p>
        <p><strong>Query Enabled:</strong> {(!!userAddress && isConnected).toString()}</p>
        <p><strong>Loading:</strong> {isLoading.toString()}</p>
        <p><strong>Error:</strong> {error?.message || 'None'}</p>
        <p><strong>Raw Balance:</strong> {balance?.toString() || 'undefined'}</p>
        <p><strong>Formatted:</strong> {balance ? formatUSD(balance as bigint, false) + ' USDC' : 'N/A'}</p>
        <p><strong>Query Key:</strong> {JSON.stringify(queryKey)}</p>
      </div>
    </div>
  )
}
