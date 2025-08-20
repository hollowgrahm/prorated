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
import { Lock, DollarSign, Calendar, TrendingUp, Info, Wallet } from 'lucide-react'
import { Pool } from '@/types/pool'

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
  const [isContributing, setIsContributing] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false) // Mock wallet state

  const currentLockWeeks = lockWeeks[0]
  const lockColor = getLockColor(currentLockWeeks)
  const contributionValue = parseFloat(contributionAmount) || 0
  const sharesReceived = contributionValue * currentLockWeeks
  
  // Calculate average lock duration from pool data
  const averageLockWeeks = pool.totalShares > 0 ? pool.totalShares / pool.totalContributions : 0

  const handleContribute = async () => {
    if (!isWalletConnected) {
      // Would trigger wallet connection
      setIsWalletConnected(true)
      return
    }

    setIsContributing(true)
    
    // Simulate transaction
    setTimeout(() => {
      setIsContributing(false)
      // Reset form or show success
      setContributionAmount('')
    }, 3000)
  }

  const isValidAmount = contributionValue > 0 && contributionValue >= 10 // Min $10

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
              Contribution Amount ({pool.fundingTokenSymbol})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {pool.fundingTokenSymbol}
              </span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="pl-16 text-lg"
                min="10"
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum contribution: 10.00 {pool.fundingTokenSymbol}
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
                  <span>{contributionValue.toLocaleString()} {pool.fundingTokenSymbol}</span>
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
              Your contribution will be locked for the selected duration. Pool shares are calculated as: 
              contribution amount × lock duration in weeks. Longer locks give you proportionally more shares.
            </AlertDescription>
          </Alert>

          {/* Contribute Button */}
          <Button
            onClick={handleContribute}
            disabled={!isValidAmount || isContributing}
            className="w-full btn-primary-custom"
            size="lg"
          >
            {isContributing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Contributing...</span>
              </div>
            ) : !isWalletConnected ? (
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </div>
            ) : !isValidAmount ? (
              'Enter Amount'
            ) : (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Contribute {contributionValue.toLocaleString()} {pool.fundingTokenSymbol}</span>
              </div>
            )}
          </Button>
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
                1,000 {pool.fundingTokenSymbol} × 100 weeks = 100,000 shares
              </div>
            </div>
            
            <div className="p-3 rounded bg-secondary/20 border border-border/30">
              <div className="font-medium mb-1">Example 2:</div>
              <div className="text-muted-foreground">
                100,000 {pool.fundingTokenSymbol} × 1 week = 100,000 shares
              </div>
            </div>
            
            <div className="p-3 rounded bg-primary/10 border border-primary/20">
              <div className="font-medium mb-2">Lock Duration Benefits:</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Longer locks = more shares per {pool.fundingTokenSymbol}</li>
                <li>• More shares = larger portion of token allocation</li>
                <li>• Higher voting power in DAO governance</li>
                <li>• Demonstrates long-term commitment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

