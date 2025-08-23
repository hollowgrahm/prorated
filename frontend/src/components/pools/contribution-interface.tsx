'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, DollarSign, Calendar, TrendingUp, Info, Wallet, Activity } from 'lucide-react'
import { Pool } from '@/types/pool'
import { getTokenSymbol } from '@/lib/token-utils'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { useFormSubmission } from '@/hooks/useLoadingState'

interface ContributionInterfaceProps {
  pool: Pool
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
  const [contributionAmount, setContributionAmount] = useState('')
  const [lockWeeks, setLockWeeks] = useState([52]) // Default to 1 year
  const [isWalletConnected, setIsWalletConnected] = useState(false) // Mock wallet state
  
  const { isSubmitting, isSuccess, error, submit, reset } = useFormSubmission()

  const currentLockWeeks = lockWeeks[0]
  const lockColor = getLockColor(currentLockWeeks)
  const contributionValue = parseFloat(contributionAmount) || 0
  const sharesReceived = contributionValue * currentLockWeeks
  
  // Calculate average lock duration from pool data
  const averageLockWeeks = pool.totalShares > 0 ? pool.totalShares / pool.totalContributions : 0
  
  // Get dynamic token symbol
  const fundingTokenSymbol = getTokenSymbol(pool.fundingToken)

  const handleContribute = async () => {
    if (!isWalletConnected) {
      // Would trigger wallet connection
      setIsWalletConnected(true)
      return
    }

    await submit(async () => {
      // Simulate contribution transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate random error (5% chance)
      if (Math.random() < 0.05) {
        throw new Error('Transaction failed: Insufficient allowance or network error')
      }
      
      return { txHash: '0x' + Math.random().toString(16).slice(2, 42) }
    })
    
    // Reset form on success
    if (isSuccess) {
      setContributionAmount('')
    }
  }

  const isValidAmount = contributionValue > 0 // No minimum contribution requirement

  return (
    <div className="space-y-6">
      {/* Contribution Form */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Contribute to {pool.tokenSymbol}</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Contribution Amount ({fundingTokenSymbol})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {fundingTokenSymbol}
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="pl-16 text-lg"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              No minimum individual contribution required
            </p>
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
                value={lockWeeks}
                onValueChange={setLockWeeks}
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
                  <span>{contributionValue.toLocaleString()} {fundingTokenSymbol}</span>
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
              When deployed, liquidity funds create an 80/20 {pool.tokenSymbol}/{fundingTokenSymbol} pool against the ENTIRE token supply. 
              Your pool shares determine your portion of LP tokens, which are locked in your veNFT.
            </AlertDescription>
          </Alert>

          {/* Contribute Button */}
          <Button
            onClick={handleContribute}
            disabled={!isValidAmount || isSubmitting}
            className="w-full btn-primary-custom"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Contributing...
              </>
            ) : !isWalletConnected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            ) : !isValidAmount ? (
              'Enter Amount'
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Contribute {contributionValue.toLocaleString()} {fundingTokenSymbol}
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              title="Contribution Failed"
              description="There was an error processing your contribution. Please try again."
              onRetry={handleContribute}
              variant="destructive"
            />
          )}

          {/* Success Display */}
          {isSuccess && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                <strong>Contribution Successful!</strong> Your contribution has been processed and you'll receive your veNFT position when the pool launches.
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
                1,000 {fundingTokenSymbol} × 100 weeks = 100,000 shares
              </div>
            </div>
            
            <div className="p-3 rounded bg-secondary/20 border border-border/30">
              <div className="font-medium mb-1">Example 2:</div>
              <div className="text-muted-foreground">
                100,000 {fundingTokenSymbol} × 1 week = 100,000 shares
              </div>
            </div>
            
            <div className="p-3 rounded bg-primary/10 border border-primary/20">
              <div className="font-medium mb-2">What You Get:</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Pool shares proportional to (contribution × lock duration)</li>
                <li>• Portion of {pool.tokenSymbol} tokens when deployed</li>
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

