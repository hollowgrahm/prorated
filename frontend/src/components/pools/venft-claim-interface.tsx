'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Trophy, 
  Vote, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  Info,
  Activity,
  Zap,
  Gift,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'
import { Pool } from '@/types/pool'
import { getTokenSymbol } from '@/lib/token-utils'
import { useVeNFTMinting } from '@/hooks/useVeNFTMinting'
import { formatUnits } from 'viem'

interface VeNFTClaimInterfaceProps {
  pool: Pool
}



export function VeNFTClaimInterface({ pool }: VeNFTClaimInterfaceProps) {
  const fundingTokenSymbol = getTokenSymbol(pool.fundingToken)
  const {
    isClaiming,
    isConfirming,
    isSuccess,
    error,
    txHash,
    claimedTokenId,
    userContribution,
    hasUnclaimedContribution,
    claimVeNFTPosition
  } = useVeNFTMinting(pool.address as `0x${string}`)

  // Debug logging
  console.log('VeNFTClaimInterface rendering:', {
    poolAddress: pool.address,
    userContribution,
    hasUnclaimedContribution,
    fundingTokenSymbol
  })

  // For demo purposes, show mock data if no real contribution exists
  const shouldShowInterface = hasUnclaimedContribution || true // Always show for demo
  
  if (!shouldShowInterface) {
    return null
  }
  
  // Convert bigint values to numbers for display, with fallback mock data
  const contributionAmount = userContribution ? Number(formatUnits(userContribution.amount, 6)) : 5000 // Mock: 5000 USDC
  const lockDurationWeeks = userContribution ? Number(userContribution.lockDuration) : 52 // Mock: 52 weeks
  const userShares = userContribution ? Number(userContribution.shares) : 260000 // Mock: 5000 * 52
  
  // Calculate estimated LP tokens (simplified calculation)
  const estimatedLPTokens = userShares > 0 ? Math.floor(userShares / 50) : 1250 // Mock: 1250 LP tokens
  
  // Calculate voting power (simplified - actual calculation is more complex)
  const estimatedVotingPower = Math.floor(estimatedLPTokens * lockDurationWeeks * 0.75)
  
  // Calculate lock end time
  const lockEndTime = new Date(Date.now() + lockDurationWeeks * 7 * 24 * 60 * 60 * 1000)

  const handleClaimVeNFT = async () => {
    await claimVeNFTPosition()
  }

  // For demo, assume not claimed unless real data says otherwise
  const isClaimed = userContribution?.claimed || false
  
  if (isClaimed) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-400 mb-2">veNFT Already Claimed</h3>
          <p className="text-muted-foreground mb-4">
            You have already claimed your veNFT position for this pool.
          </p>
          <Button 
            variant="outline" 
            className="btn-outline-custom"
            onClick={() => window.open(`/projects/${pool.address}/govern`, '_blank')}
          >
            View in Governance
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess && claimedTokenId) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-400">veNFT Claimed Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <Alert className="border-green-500/50 bg-green-500/10">
            <AlertDescription>
              Your veNFT #{claimedTokenId} has been minted with {estimatedLPTokens.toLocaleString()} LP tokens 
              locked for {lockDurationWeeks} weeks.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Token ID</p>
              <p className="font-bold">#{claimedTokenId}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Vote className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Voting Power</p>
              <p className="font-bold">{estimatedVotingPower.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Lock Until</p>
              <p className="font-bold text-xs">{lockEndTime.toLocaleDateString()}</p>
            </div>
          </div>

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

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              className="btn-primary-custom"
              onClick={() => window.open(`/projects/${pool.address}/govern`, '_blank')}
            >
              Manage veNFT
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="btn-outline-custom"
              onClick={() => window.open(`/projects/${pool.address}`, '_blank')}
            >
              View Project
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Gift className="h-5 w-5 text-primary" />
          <span>Claim Your veNFT Position</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Convert your pool contribution into a vote-escrowed NFT for governance participation
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Contribution Summary */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-medium mb-3 flex items-center">
            <Info className="h-4 w-4 mr-2 text-primary" />
            Your Pool Contribution
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Amount Contributed</p>
              <p className="font-medium">{contributionAmount.toLocaleString()} {fundingTokenSymbol}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lock Duration</p>
              <p className="font-medium">{lockDurationWeeks} weeks</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pool Shares</p>
              <p className="font-medium">{userShares.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">LP Tokens</p>
              <p className="font-medium">{estimatedLPTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* veNFT Preview */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <Trophy className="h-4 w-4 mr-2 text-primary" />
            Your veNFT Will Include
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg border border-muted/50">
              <div className="flex items-center mb-2">
                <Activity className="h-4 w-4 text-primary mr-2" />
                <span className="font-medium text-sm">LP Token Lock</span>
              </div>
              <p className="text-lg font-bold">{estimatedLPTokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {pool.tokenSymbol}/{fundingTokenSymbol} LP tokens
              </p>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg border border-muted/50">
              <div className="flex items-center mb-2">
                <Vote className="h-4 w-4 text-primary mr-2" />
                <span className="font-medium text-sm">Voting Power</span>
              </div>
              <p className="text-lg font-bold">{estimatedVotingPower.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Decays linearly over time
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start space-x-2">
              <Clock className="h-4 w-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-400">Lock Duration</p>
                <p className="text-xs text-muted-foreground">
                  Your LP tokens will be locked until <strong>{lockEndTime.toLocaleDateString()}</strong> 
                  ({lockDurationWeeks} weeks from now)
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Benefits */}
        <div className="space-y-3">
          <h4 className="font-medium">veNFT Benefits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <Vote className="h-4 w-4 text-green-400" />
              <span>Governance voting rights</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-400" />
              <span>Protocol fee rewards</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span>Boost rewards on lending</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span>NFT collectible value</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Claim Failed:</strong> {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Claim Button */}
        <Button
          onClick={handleClaimVeNFT}
          disabled={isClaiming || isConfirming}
          className="w-full btn-primary-custom"
          size="lg"
        >
          {isClaiming ? (
            <>
              <Activity className="mr-2 h-5 w-5 animate-spin" />
              Claiming veNFT...
            </>
          ) : isConfirming ? (
            <>
              <Activity className="mr-2 h-5 w-5 animate-spin" />
              Confirming Transaction...
            </>
          ) : (
            <>
              <Gift className="mr-2 h-5 w-5" />
              Claim veNFT Position
            </>
          )}
        </Button>

        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> Once claimed, your LP tokens will be locked in the veNFT for {lockDurationWeeks} weeks. 
            You can manage your position (extend lock, add tokens) but cannot unlock early.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
