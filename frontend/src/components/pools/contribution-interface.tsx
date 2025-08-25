'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, DollarSign, Calendar, TrendingUp, Info, Wallet, Activity } from 'lucide-react'
import { PoolData } from '@/types'
import { useAccount, useReadContract } from 'wagmi'
import { useContribution } from '@/hooks/useContribution'
import { useFaucet } from '@/hooks/useFaucet'
import { formatUSD } from '@/lib/utils'
import { ExistingContribution } from './existing-contribution'


interface ContributionInterfaceProps {
  pool: PoolData
}

// Lock duration directly multiplies the contribution to create shares
// shares = contribution * lockWeeks
const getLockColor = (weeks: number) => {
  if (weeks >= 156) return 'text-purple-400'   // 3+ years
  if (weeks >= 104) return 'text-blue-400'     // 2+ years  
  if (weeks >= 52) return 'text-green-400'     // 1+ years
  if (weeks >= 26) return 'text-yellow-400'    // 6+ months
  if (weeks >= 12) return 'text-orange-400'    // 3+ months
  return 'text-red-400'                        // < 3 months
}

const formatDuration = (weeks: number) => {
  if (weeks >= 52) {
    const years = Math.floor(weeks / 52)
    const remainingWeeks = weeks % 52
    if (remainingWeeks === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`
    }
    return `${years}y ${remainingWeeks}w`
  }
  if (weeks >= 4) {
    const months = Math.floor(weeks / 4)
    const remainingWeeks = weeks % 4
    if (remainingWeeks === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`
    }
    return `${months}mo ${remainingWeeks}w`
  }
  return `${weeks} week${weeks !== 1 ? 's' : ''}`
}

export function ContributionInterface({ pool }: ContributionInterfaceProps) {
  const { address: userAddress } = useAccount()
  const contribution = useContribution(pool.address)
  const faucet = useFaucet()
  
  // Check if user has existing contribution
  const { data: existingContribution, refetch: refetchContribution } = useReadContract({
    address: pool.address,
    abi: [
      {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'contributions',
        outputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'lockDuration', type: 'uint256' },
          { name: 'shares', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' }
        ],
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'contributions',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
      refetchInterval: 1000, // Refetch every 1 second to catch updates quickly
      staleTime: 0, // Always consider data stale to force fresh queries
    },
  })
  
  const hasExistingContribution = existingContribution && existingContribution[0] > 0n

  const currentLockWeeks = contribution.lockDuration
  const lockColor = getLockColor(currentLockWeeks)
  const contributionValue = parseFloat(contribution.contributionAmount) || 0
  const sharesReceived = contributionValue * currentLockWeeks
  
  // Calculate average lock duration from pool data
  const averageLockWeeks = pool.totalContributions > 0n ? Number(pool.totalShares) / Number(pool.totalContributions) : 0

  const handleContribute = async () => {
    if (!userAddress) {
      // Wallet connection should be handled by the app
      return
    }

    if (contribution.needsApproval) {
      contribution.approveTokens()
    } else {
      contribution.contribute()
    }
  }

  const handleMintUSDC = () => {
    faucet.claimUSDC()
  }

  // Trigger refetch of contribution data when contribution is confirmed
  useEffect(() => {
    if (contribution.contribution.isConfirmed) {
      // Instead of resetting form, refetch the contribution data to switch to existing contribution interface
      // Add a small delay to ensure the transaction has been processed
      const timer = setTimeout(() => {
        refetchContribution()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [contribution.contribution.isConfirmed, refetchContribution])

  // Refresh balance after successful faucet claim
  // Note: The balance should refresh automatically via wagmi's query invalidation

  // If user has existing contribution, show existing contribution interface
  if (hasExistingContribution && existingContribution) {
    return (
      <ExistingContribution 
        pool={pool}
        contribution={{
          amount: existingContribution[0],
          lockDuration: Number(existingContribution[1]),
          shares: existingContribution[2],
          timestamp: existingContribution[3]
        }}
        onTransactionSuccess={() => refetchContribution()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Contribution Form */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Contribute to {pool.config.tokenSymbol}</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Amount Input */}
          {/* USDC Balance and Mint Button */}
          <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Your USDC Balance</p>
              <p className="font-medium">
                {contribution.usdcBalance ? formatUSD(contribution.usdcBalance, false) : '0'} USDC
              </p>
            </div>
            <Button
              onClick={handleMintUSDC}
              disabled={faucet.isLoading}
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0 hover:border-0"
            >
              {faucet.isLoading ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-pulse" />
                  Claiming...
                </>
              ) : faucet.success ? (
                <>
                  <Activity className="mr-2 h-4 w-4" />
                  Claimed!
                </>
              ) : (
                'Get 10K USDC'
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Contribution Amount (USDC)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">
                USDC
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={contribution.contributionAmount}
                onChange={(e) => contribution.setContributionAmount(e.target.value)}
                className="pl-16 text-lg"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">No minimum individual contribution required</span>
              {!contribution.validation.isValid && contribution.validation.error && (
                <span className="text-red-400">{contribution.validation.error}</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Lock Duration Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center space-x-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>Lock Duration</span>
              </Label>
              <Badge variant="outline" className={`${lockColor} border-current`}>
                {currentLockWeeks} week{currentLockWeeks !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">1 week</span>
                <span className="font-medium">{formatDuration(currentLockWeeks)}</span>
                <span className="text-muted-foreground">4 years</span>
              </div>
              
              <Slider
                value={[contribution.lockDuration]}
                onValueChange={(value) => contribution.setLockDuration(value[0])}
                min={1}
                max={208}
                step={1}
                className="w-full"
              />
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Lock duration directly multiplies your contribution to create pool shares
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contribution Summary */}
          {contributionValue > 0 && (
            <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border/30">
              <h4 className="font-medium text-sm">Contribution Summary</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contribution Amount:</span>
                  <span>{contributionValue.toLocaleString()} USDC</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock Duration:</span>
                  <span>{formatDuration(currentLockWeeks)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shares Formula:</span>
                  <span className="font-mono text-xs">{contributionValue.toLocaleString()} × {currentLockWeeks}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-medium">
                  <span>Pool Shares Received:</span>
                  <span className="text-primary">{sharesReceived.toLocaleString()}</span>
                </div>
              </div>
              
              {averageLockWeeks > 0 && (
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Pool average lock: {averageLockWeeks.toFixed(1)} weeks
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Info Alert */}
          <Alert className="border-blue-500/20 bg-blue-500/5">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>How it works:</strong> Your contribution is locked for the selected duration. Pool shares = contribution × lock weeks. 
              When deployed, liquidity funds create an 80/20 {pool.config.tokenSymbol}/USDC pool against the ENTIRE token supply. 
              Your pool shares determine your portion of LP tokens, which are locked in your veNFT.
            </AlertDescription>
          </Alert>

          {/* Contribute Button */}
          <Button
            onClick={handleContribute}
            disabled={!contribution.validation.isValid || contribution.isTransacting}
            className="w-full btn-primary-custom"
            size="lg"
          >
            {contribution.isTransacting ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                {contribution.approve.isPending ? 'Approving...' : 
                 contribution.contribution.isPending ? 'Contributing...' : 'Processing...'}
              </>
            ) : !userAddress ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            ) : !contribution.validation.isValid ? (
              contribution.validation.error || 'Enter Amount'
            ) : contribution.needsApproval ? (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Approve USDC
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Contribute {contributionValue.toLocaleString()} USDC
              </>
            )}
          </Button>

          {/* Error Display */}
          {(contribution.approve.error || contribution.contribution.error || faucet.error) && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                <strong>Transaction Failed:</strong> {
                  contribution.approve.error?.message || 
                  contribution.contribution.error?.message || 
                  faucet.error
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {contribution.contribution.isConfirmed && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                <strong>Contribution Successful!</strong> Your contribution has been processed and you&apos;ll receive your veNFT position when the pool launches.
              </AlertDescription>
            </Alert>
          )}

          {/* Mint Success */}
          {faucet.success && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                <strong>USDC Claimed!</strong> 10,000 USDC has been added to your wallet for testing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Shares Calculation Examples */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Shares Calculation Examples</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded bg-secondary/20 border border-border/30">
              <div className="font-medium mb-1">Example 1:</div>
              <div className="text-muted-foreground">
                1,000 USDC × 100 weeks = 100,000 shares
              </div>
            </div>
            
            <div className="p-3 rounded bg-secondary/20 border border-border/30">
              <div className="font-medium mb-1">Example 2:</div>
              <div className="text-muted-foreground">
                100,000 USDC × 1 week = 100,000 shares
              </div>
            </div>
            
            <div className="p-3 rounded bg-primary/10 border border-primary/20">
              <div className="font-medium mb-2">What You Get:</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Pool shares proportional to (contribution × lock duration)</li>
                <li>• Portion of {pool.config.tokenSymbol} tokens when deployed</li>
                <li>• LP tokens locked in your veNFT from liquidity seeding</li>
                <li>• Voting power in DAO governance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

