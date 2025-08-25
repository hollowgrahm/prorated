'use client'

import { AlertTriangle, RefreshCw, CheckCircle, ExternalLink, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Pool } from '@/types/pool'
import { getTokenSymbol } from '@/lib/token-utils'
import { usePoolWithdrawal } from '@/hooks/usePoolWithdrawal'

interface WithdrawalInterfaceProps {
  pool: Pool
}

export function WithdrawalInterface({ pool }: WithdrawalInterfaceProps) {
  const fundingTokenSymbol = getTokenSymbol(pool.fundingToken)
  
  const {
    userContribution,
    hasContribution,
    isWithdrawing,
    isConfirming,
    isSuccess,
    error,
    txHash,
    claimRefund
  } = usePoolWithdrawal()

  if (isSuccess) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <CardTitle className="text-xl text-accent">Refund Claimed Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your contribution of {userContribution.amount.toLocaleString()} {fundingTokenSymbol} has been refunded to your wallet.
            </AlertDescription>
          </Alert>
          
          {txHash && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Transaction Hash:</span>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:text-primary/80"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (userContribution.claimed) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Refund Already Claimed</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You have already claimed your refund for this failed pool.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-accent">Pool Failed - Claim Refund</CardTitle>
            <p className="text-sm text-muted-foreground">
              This pool failed to reach its minimum funding goal
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This pool failed to reach the minimum funding target of{' '}
            {pool.minTotalContributions.toLocaleString()} {fundingTokenSymbol}.
            All contributors can claim a full refund of their contributions.
          </AlertDescription>
        </Alert>

        {/* Demo Notice */}
        <Alert className="border-green-500/50 bg-green-500/10">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> This is a demonstration of the refund interface. 
            Clicking &quot;Claim Refund&quot; will mint 10,000 USDC to your wallet to simulate receiving your refund.
          </AlertDescription>
        </Alert>

        {/* Pool Status Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Raised:</span>
              <span className="font-medium">
                {pool.totalContributions.toLocaleString()} {fundingTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Target Amount:</span>
              <span className="font-medium">
                {pool.minTotalContributions.toLocaleString()} {fundingTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Shortfall:</span>
              <span className="font-medium text-red-400">
                {(pool.minTotalContributions - pool.totalContributions).toLocaleString()} {fundingTokenSymbol}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pool Status:</span>
              <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">
                Failed
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Success Rate:</span>
              <span className="font-medium text-red-400">
                {((pool.totalContributions / pool.minTotalContributions) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Your Contribution */}
        <div className="space-y-4">
          <h3 className="font-medium text-accent">Your Contribution</h3>
          
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Contribution Amount:</span>
              <span className="font-medium text-lg">
                {userContribution.amount.toLocaleString()} {fundingTokenSymbol}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lock Duration:</span>
              <span className="font-medium">
                {userContribution.lockWeeks} weeks
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Shares (Unrealized):</span>
              <span className="font-medium text-muted-foreground">
                {userContribution.shares.toLocaleString()}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Refund Amount:</span>
              <span className="font-bold text-lg text-accent">
                {userContribution.amount.toLocaleString()} {fundingTokenSymbol}
              </span>
            </div>
          </div>

          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertDescription>
              You will receive a full refund of your original contribution. 
              No fees or penalties apply for failed pools.
            </AlertDescription>
          </Alert>
        </div>

        {/* Withdrawal Button */}
        <Button
          onClick={claimRefund}
          disabled={isWithdrawing || isConfirming || !hasContribution}
          className="w-full btn-primary"
          size="lg"
        >
          {isWithdrawing || isConfirming ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {isWithdrawing ? 'Processing Refund...' : 'Confirming Transaction...'}
            </>
          ) : (
            <>
              Claim Refund ({userContribution.amount.toLocaleString()} {fundingTokenSymbol})
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to claim refund: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Refunds are processed immediately upon claiming</p>
          <p>• You can only claim your refund once</p>
          <p>• Refunds are only available after the pool funding period has ended</p>
          <p>• All gas fees for the refund transaction are paid by you</p>
        </div>
      </CardContent>
    </Card>
  )
}
