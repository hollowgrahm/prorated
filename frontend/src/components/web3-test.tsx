'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useBalance } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { env } from '@/lib/env'
import { CONTRACTS } from '@/lib/contracts'
import { formatTokenAmount, truncateAddress } from '@/lib/utils'
import { useAllPoolsLength, useUSDCBalance } from '@/hooks'

export function Web3Test() {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({
    address,
  })
  
  // Test our custom hooks
  const { data: poolsLength } = useAllPoolsLength()
  const { data: usdcBalance } = useUSDCBalance(address)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="gradient-text">Prorated Protocol</CardTitle>
        <CardDescription>
          Web3 Integration Test - Anvil Local Development
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        
        {isConnected && (
          <div className="space-y-3">
            <div>
              <Badge variant="outline" className="text-xs">
                Connected to {chain?.name || 'Unknown Chain'}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Address:</span>
                <br />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {address}
                </code>
              </div>
              
              {balance && (
                <div>
                  <span className="text-muted-foreground">Balance:</span>
                  <br />
                  <span className="font-mono">
                    {formatTokenAmount(balance.value, balance.decimals, 6)} {balance.symbol}
                  </span>
                </div>
              )}
              
              <div>
                <span className="text-muted-foreground">Chain ID:</span>
                <br />
                <span className="font-mono">{chain?.id || 'Unknown'}</span>
              </div>
              
              <div>
                <span className="text-muted-foreground">RPC URL:</span>
                <br />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {env.rpcUrl}
                </code>
              </div>
              
              {usdcBalance !== undefined && (
                <div>
                  <span className="text-muted-foreground">USDC Balance:</span>
                  <br />
                  <span className="font-mono">
                    {formatTokenAmount(usdcBalance, 6, 2)} USDC
                  </span>
                </div>
              )}
              
              {poolsLength !== undefined && (
                <div>
                  <span className="text-muted-foreground">Total Pools:</span>
                  <br />
                  <span className="font-mono">{poolsLength.toString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <Separator />
        
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Contract Addresses</h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Factory:</span>
              <code className="ml-2 bg-muted px-1 py-0.5 rounded">
                {truncateAddress(CONTRACTS.proratedFactory)}
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">USDC:</span>
              <code className="ml-2 bg-muted px-1 py-0.5 rounded">
                {truncateAddress(CONTRACTS.mockUSDC)}
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">Proswap:</span>
              <code className="ml-2 bg-muted px-1 py-0.5 rounded">
                {truncateAddress(CONTRACTS.proswapFactory)}
              </code>
            </div>
          </div>
        </div>
        
        {!isConnected && (
          <div className="text-center text-sm text-muted-foreground">
            Connect your wallet to test the Web3 integration
          </div>
        )}
      </CardContent>
    </Card>
  )
}
