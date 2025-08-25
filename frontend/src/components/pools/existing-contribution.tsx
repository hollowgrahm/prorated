'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useContribution } from '@/hooks/useContribution'
import { useUSDCBalance, useUSDCAllowance } from '@/hooks/useContracts'
import { parseContributionAmount } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Clock, 
  DollarSign, 
  Plus,
  Calendar,
  Target,
  CheckCircle,
  TrendingUp
} from 'lucide-react'
import { PoolData } from '@/types'

interface ExistingContributionProps {
  pool: PoolData
  contribution: {
    amount: bigint
    lockDuration: number
    shares: bigint
    timestamp: bigint
  }
  onTransactionSuccess?: () => void
}

export function ExistingContribution({ pool, contribution, onTransactionSuccess }: ExistingContributionProps) {
  const { address: userAddress } = useAccount()
  const contributionHooks = useContribution(pool.address)
  
  // Local state for form inputs
  const [increaseAmount, setIncreaseAmount] = useState('')
  const [newLockDuration, setNewLockDuration] = useState(contribution.lockDuration)
  const [showSuccessAlert, setShowSuccessAlert] = useState<'increase' | 'duration' | null>(null)
  
  // Get user balances and allowances
  const { data: usdcBalance } = useUSDCBalance(userAddress)
  const { data: allowance } = useUSDCAllowance(userAddress, pool.address)
  
  // Parse increase amount
  const parsedIncreaseAmount = useMemo(() => {
    return parseContributionAmount(increaseAmount, 6) // USDC has 6 decimals
  }, [increaseAmount])
  
  // Check if user needs approval for increase
  const needsApprovalForIncrease = useMemo(() => {
    if (!parsedIncreaseAmount.isValid || !allowance) return false
    return parsedIncreaseAmount.amount > allowance
  }, [parsedIncreaseAmount, allowance])
  
  // Check if user has sufficient balance for increase
  const hasSufficientBalanceForIncrease = useMemo(() => {
    if (!parsedIncreaseAmount.isValid || !usdcBalance) return false
    return parsedIncreaseAmount.amount <= usdcBalance
  }, [parsedIncreaseAmount, usdcBalance])

  // Format large numbers for display
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  // Convert contribution data for display
  const currentAmount = Number(contribution.amount) / 1e6 // USDC has 6 decimals
  const currentShares = Number(contribution.shares)
  const increaseValue = parseFloat(increaseAmount) || 0
  
  // Calculate new values if user increases
  const newTotalAmount = currentAmount + increaseValue
  const additionalShares = increaseValue * contribution.lockDuration
  const newTotalShares = currentShares + additionalShares
  
  // Calculate new values if user extends duration
  const durationIncrease = newLockDuration - contribution.lockDuration
  const durationBonusShares = currentAmount * durationIncrease
  const extendedTotalShares = currentShares + durationBonusShares

  const handleIncreaseContribution = async () => {
    if (!parsedIncreaseAmount.isValid || !hasSufficientBalanceForIncrease) return
    
    if (needsApprovalForIncrease) {
      contributionHooks.approveTokens()
    } else {
      contributionHooks.increaseContribution(parsedIncreaseAmount.amount)
    }
  }

  const handleExtendDuration = async () => {
    if (!userAddress || newLockDuration <= contribution.lockDuration) return
    
    contributionHooks.increaseLockDuration(newLockDuration)
  }

  // Auto-refresh and reset form after successful transactions
  useEffect(() => {
    if (contributionHooks.increaseContributionTx.isConfirmed) {
      // Reset the increase amount form
      setIncreaseAmount('')
      // Show success alert
      setShowSuccessAlert('increase')
      // Trigger immediate data refresh
      onTransactionSuccess?.()
      // Hide success alert after 5 seconds
      setTimeout(() => setShowSuccessAlert(null), 5000)
    }
  }, [contributionHooks.increaseContributionTx.isConfirmed, onTransactionSuccess])

  useEffect(() => {
    if (contributionHooks.increaseLockDurationTx.isConfirmed) {
      // Show success alert
      setShowSuccessAlert('duration')
      // Trigger immediate data refresh
      onTransactionSuccess?.()
      // Hide success alert after 5 seconds
      setTimeout(() => setShowSuccessAlert(null), 5000)
    }
  }, [contributionHooks.increaseLockDurationTx.isConfirmed, onTransactionSuccess])

  return (
    <div className="space-y-6">
      {/* Success Alerts */}
      {showSuccessAlert === 'increase' && (
        <Alert className="border-green-500/20 bg-green-500/5">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Success!</strong> Your contribution has been increased by {increaseValue.toLocaleString()} USDC. 
            Your pool data will refresh automatically.
          </AlertDescription>
        </Alert>
      )}
      
      {showSuccessAlert === 'duration' && (
        <Alert className="border-green-500/20 bg-green-500/5">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Success!</strong> Your lock duration has been extended to {newLockDuration} weeks. 
            Your shares have been recalculated automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alerts */}
      {(contributionHooks.approve.error || contributionHooks.increaseContributionTx.error) && (
        <Alert className="border-red-500/20 bg-red-500/5">
          <AlertDescription>
            <strong>Transaction Failed:</strong> {
              contributionHooks.approve.error?.message || 
              contributionHooks.increaseContributionTx.error?.message || 
              'Unknown error occurred'
            }
          </AlertDescription>
        </Alert>
      )}

      {contributionHooks.increaseLockDurationTx.error && (
        <Alert className="border-red-500/20 bg-red-500/5">
          <AlertDescription>
            <strong>Transaction Failed:</strong> {contributionHooks.increaseLockDurationTx.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Contribution Status */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>Your Active Contribution</span>
            <Badge variant="secondary" className="ml-auto">
              Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">Contributed</span>
              </div>
              <p className="text-2xl font-bold">{currentAmount.toLocaleString()} USDC</p>
            </div>
            
            <div className="p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-muted-foreground">Lock Duration</span>
              </div>
              <p className="text-2xl font-bold">{contribution.lockDuration} weeks</p>
            </div>
            
            <div className="p-4 bg-secondary/20 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-muted-foreground">Pool Shares</span>
              </div>
              <p className="text-2xl font-bold break-words">{formatLargeNumber(currentShares)}</p>
            </div>
          </div>

          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Contribution Active:</strong> Your {currentAmount.toLocaleString()} USDC is locked for {contribution.lockDuration} weeks, 
              earning you {formatLargeNumber(currentShares)} pool shares. You can increase your contribution or extend the lock duration below.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Increase Contribution */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Increase Contribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="increase-amount" className="text-sm font-medium">
              Additional Amount (USDC)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="increase-amount"
                type="number"
                placeholder="0.00"
                value={increaseAmount}
                onChange={(e) => setIncreaseAmount(e.target.value)}
                className="pl-10 text-lg"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {increaseValue > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium mb-2">New Contribution Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Amount:</span>
                  <span>{currentAmount.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Amount:</span>
                  <span>+{increaseValue.toLocaleString()} USDC</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>New Total:</span>
                  <span>{newTotalAmount.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Shares:</span>
                  <span className="break-words">+{formatLargeNumber(additionalShares)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>New Total Shares:</span>
                  <span className="break-words">{formatLargeNumber(newTotalShares)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleIncreaseContribution}
            disabled={
              !increaseAmount || 
              increaseValue <= 0 || 
              !parsedIncreaseAmount.isValid || 
              !hasSufficientBalanceForIncrease ||
              contributionHooks.isTransacting
            }
            className="w-full btn-primary-custom"
            size="lg"
          >
            {contributionHooks.isTransacting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {contributionHooks.approve.isPending ? 'Approving USDC...' : 
                 contributionHooks.approve.isConfirming ? 'Confirming Approval...' :
                 contributionHooks.increaseContributionTx.isPending ? 'Increasing Contribution...' : 
                 contributionHooks.increaseContributionTx.isConfirming ? 'Confirming Transaction...' : 'Processing...'}
              </>
            ) : !hasSufficientBalanceForIncrease ? (
              'Insufficient USDC Balance'
            ) : needsApprovalForIncrease ? (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Approve USDC
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Increase by {increaseValue > 0 ? increaseValue.toLocaleString() : '0'} USDC
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Extend Lock Duration */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Extend Lock Duration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              New Lock Duration: {newLockDuration} weeks
            </label>
            <Slider
              value={[newLockDuration]}
              onValueChange={(value) => setNewLockDuration(value[0])}
              min={contribution.lockDuration}
              max={208}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Current: {contribution.lockDuration} weeks</span>
              <span>Max: 208 weeks (4 years)</span>
            </div>
          </div>

          {newLockDuration > contribution.lockDuration && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="font-medium mb-2">Duration Extension Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Current Duration:</span>
                  <span>{contribution.lockDuration} weeks</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Duration:</span>
                  <span>+{durationIncrease} weeks</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>New Total Duration:</span>
                  <span>{newLockDuration} weeks</span>
                </div>
                <div className="flex justify-between">
                  <span>Bonus Shares:</span>
                  <span className="break-words">+{formatLargeNumber(durationBonusShares)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>New Total Shares:</span>
                  <span className="break-words">{formatLargeNumber(extendedTotalShares)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleExtendDuration}
            disabled={
              newLockDuration <= contribution.lockDuration || 
              contributionHooks.isTransacting ||
              contribution.lockDuration >= 208
            }
            className="w-full btn-primary-custom"
            size="lg"
          >
            {contributionHooks.increaseLockDurationTx.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Extending Duration...
              </>
            ) : contributionHooks.increaseLockDurationTx.isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Confirming Extension...
              </>
            ) : contribution.lockDuration >= 208 ? (
              <>
                <Target className="mr-2 h-4 w-4" />
                Already Max Locked (208 weeks)
              </>
            ) : newLockDuration <= contribution.lockDuration ? (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Select Higher Duration
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Extend to {newLockDuration} weeks
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
