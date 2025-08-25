'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Users, Clock, Target, TrendingUp } from 'lucide-react'
import { Address } from 'viem'
import { PoolData } from '@/types'
import { ContributionInterface } from './contribution-interface'
import { DeploymentWizard } from './deployment-wizard'
import { DemoDeploymentWizard } from './demo-deployment-wizard'
import { PoolTimeline } from './pool-timeline'
import { ContributorList } from './contributor-list'
import { WithdrawalInterface } from './withdrawal-interface'
import { PageLoadingSpinner } from '@/components/ui/loading-spinner'
import { PageErrorDisplay } from '@/components/ui/error-boundary'
import { usePool } from '@/hooks/usePool'
import { formatUSD, formatTimeRemaining, truncateAddress, formatTokenAmount } from '@/lib/utils'
import { NetworkHelper } from '@/components/ui/network-helper'
import { Pool } from '@/types/pool'
import { CONTRACT_ADDRESSES } from '@/lib/contracts-config'

// Check if a pool is a demo pool
function isDemoPool(poolAddress: string): boolean {
  const demoAddresses = [
    CONTRACT_ADDRESSES.activePool.toLowerCase(),
    CONTRACT_ADDRESSES.successfulPool.toLowerCase(),
    // Add launched pool if it exists (will be available after deployment)
    ...((CONTRACT_ADDRESSES as Record<string, string>).launchedPool ? [(CONTRACT_ADDRESSES as Record<string, string>).launchedPool.toLowerCase()] : [])
  ]
  return demoAddresses.includes(poolAddress.toLowerCase())
}

// Temporary adapter function to convert PoolData to Pool for legacy components
function poolDataToPool(poolData: PoolData): Pool {
  // Map the new status to the old status type
  let legacyStatus: Pool['status']
  switch (poolData.status) {
    case 'success-pending':
      legacyStatus = 'deploying'
      break
    default:
      legacyStatus = poolData.status as Pool['status']
  }

  return {
    id: poolData.address,
    address: poolData.address,
    tokenName: poolData.config.tokenName,
    tokenSymbol: poolData.config.tokenSymbol,
    tokenTotalSupply: Number(poolData.config.tokenTotalSupply),
    developmentFund: Number(poolData.config.developmentFund) / 1e6, // Convert from wei to USDC
    liquidityFund: Number(poolData.config.liquidityFund) / 1e6,
    minTotalContributions: Number(poolData.minTotalContributions) / 1e6,
    fundingToken: poolData.config.fundingToken,
    fundingTokenSymbol: 'USDC',
    startTime: poolData.config.startTime,
    endTime: poolData.config.endTime,
    developerPercent: poolData.config.developerPercent,
    treasuryPercent: poolData.config.treasuryPercent,
    daoPercent: poolData.config.daoPercent,
    totalContributions: Number(poolData.totalContributions) / 1e6,
    totalShares: Number(poolData.totalShares),
    contributors: Math.floor(Math.random() * 50) + 5, // Mock data
    status: legacyStatus,
    developer: poolData.config.owner,
    description: `A decentralized ${poolData.config.tokenName} project raising funds through community contributions.`,
    tokenAddress: poolData.proratedToken !== '0x0000000000000000000000000000000000000000' ? poolData.proratedToken : undefined,
    pairAddress: poolData.proswapPair !== '0x0000000000000000000000000000000000000000' ? poolData.proswapPair : undefined,
    governanceAddress: poolData.proratedGovernor !== '0x0000000000000000000000000000000000000000' ? poolData.proratedGovernor : undefined,
  }
}

interface PoolPageProps {
  address: string
}

function getStatusColor(status: PoolData['status']): string {
  switch (status) {
    case 'upcoming':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'deploying':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'launched':
      return 'bg-primary/20 text-primary border-primary/30'
    default:
      return 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
  }
}

export function PoolPage({ address }: PoolPageProps) {
  const router = useRouter()
  const { data: pool, isLoading, error, refetch } = usePool(address as Address)

  // Redirect to project page if launched
    if (pool?.status === 'launched') {
      router.push(`/projects/${address}`)
    return null
    }

  if (isLoading) {
    return <PageLoadingSpinner text="Loading pool details..." />
  }

  if (error || !pool) {
    return (
      <PageErrorDisplay
        error={error?.message || `Pool at address ${address} not found`}
        title="Pool Not Found"
        description="The pool you're looking for doesn't exist or may have been removed."
        onRetry={refetch}
      />
    )
  }

  // Generate a simple description based on pool data (since we don't store descriptions in contracts)
  const description = `A decentralized ${pool.config.tokenName} project raising funds through community contributions. Join the movement and help shape the future of decentralized finance.`
  
  // Mock contributors count (since we don't have this data from contracts yet)
  const contributors = Math.floor(Math.random() * 50) + 5
  
  // Convert PoolData to Pool for legacy components
  const legacyPool = poolDataToPool(pool)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pools
        </Button>

        {/* Network Helper */}
        <div className="mb-6">
          <NetworkHelper />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pool Header */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{pool.config.tokenName}</CardTitle>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-sm border-primary/30 bg-primary/5">
                        {pool.config.tokenSymbol}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-sm ${getStatusColor(pool.status)}`}
                      >
                        {pool.status === 'deploying' ? 'Deploying' : pool.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {truncateAddress(pool.address)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-foreground leading-relaxed">
                  {description}
                </p>
              </CardContent>
            </Card>

            {/* Pool Status Content */}
            {pool.status === 'active' ? (
              <ContributionInterface pool={pool} />
            ) : pool.status === 'deploying' || pool.status === 'success-pending' ? (
              isDemoPool(pool.address) ? (
                <DemoDeploymentWizard pool={pool} />
              ) : (
                <DeploymentWizard pool={legacyPool} />
              )
            ) : pool.status === 'failed' ? (
              <WithdrawalInterface pool={legacyPool} />
            ) : (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle>
                    {pool.status === 'upcoming' ? 'Funding Starts Soon' : 'Pool Status'}
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  {pool.status === 'upcoming' && (
                    <div className="text-center py-8">
                      <p className="text-lg mb-4">
                        Funding will begin soon. You can bookmark this pool to get notified.
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Starts: {new Date(pool.config.startTime * 1000).toLocaleDateString()}
                      </p>
                      <Button variant="outline" className="btn-outline-custom">
                        Notify Me
                      </Button>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pool Configuration */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>Pool Configuration</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Token Supply</span>
                    <p className="font-medium">{formatTokenAmount(pool.config.tokenTotalSupply, 18, 0)} {pool.config.tokenSymbol}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Funding Token</span>
                    <p className="font-medium">USDC</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Development Fund</span>
                    <p className="font-medium">{formatUSD(pool.config.developmentFund, false)} USDC</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Liquidity Fund</span>
                    <p className="font-medium">{formatUSD(pool.config.liquidityFund, false)} USDC</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Developer</span>
                    <p className="font-mono text-sm break-all">{truncateAddress(pool.config.owner)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <span className="text-muted-foreground text-sm">Token Allocation Percentages</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center p-2 bg-secondary/20 rounded">
                      <div className="text-sm font-medium">{pool.config.developerPercent}%</div>
                      <div className="text-xs text-muted-foreground">Developer</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/20 rounded">
                      <div className="text-sm font-medium">{pool.config.treasuryPercent}%</div>
                      <div className="text-xs text-muted-foreground">Treasury</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/20 rounded">
                      <div className="text-sm font-medium">{pool.config.daoPercent}%</div>
                      <div className="text-xs text-muted-foreground">DAO</div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">🔄 Liquidity Seeding</h4>
                  <p className="text-xs text-muted-foreground">
                    Liquidity fund ({formatUSD(pool.config.liquidityFund, false)} USDC) is the <strong>minimum</strong> for seeding. 
                    Any oversubscription beyond the {formatUSD(pool.minTotalContributions, false)} USDC goal 
                    goes entirely to liquidity, creating a deeper 80/20 {pool.config.tokenSymbol}/USDC pool 
                    against the ENTIRE token supply. Contributors receive LP tokens proportional to their pool shares, locked in their veNFT.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pool Stats */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>Funding Progress</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(pool.progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/60 shadow-inner">
                    <div 
                      className={`h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ${
                        pool.status === 'active' ? 'animate-pulse-slow shadow-sm shadow-primary/50' : ''
                      }`}
                      style={{ width: `${pool.progressPercentage}%` }}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Stats Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-medium">{formatUSD(pool.totalContributions, false)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goal</span>
                    <span className="font-medium">{formatUSD(pool.minTotalContributions, false)} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Shares</span>
                    <span className="font-medium">{formatTokenAmount(pool.totalShares, 0, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Lock Duration</span>
                    <span className="font-medium">
                      {pool.totalContributions > 0n ? (Number(pool.totalShares) / Number(pool.totalContributions)).toFixed(1) : '0'} weeks
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contributors</span>
                    <span className="font-medium flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {contributors}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span className="font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTimeRemaining(pool.config.endTime)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pool Timeline */}
            <PoolTimeline pool={legacyPool} />
          </div>
        </div>

        {/* Full Width Contributor List */}
        <div className="mt-8">
          <ContributorList pool={legacyPool} />
        </div>
      </div>
    </div>
  )
}
