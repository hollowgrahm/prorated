'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Users, Clock, Target, TrendingUp } from 'lucide-react'
import { Pool } from '@/types/pool'
import { ContributionInterface } from './contribution-interface'
import { DeploymentWizard } from './deployment-wizard'
import { PoolTimeline } from './pool-timeline'
import { ContributorList } from './contributor-list'

// Mock data - will be replaced with real contract data
const mockPools: Pool[] = [
  {
    id: '1',
    address: '0x1234...5678',
    tokenName: 'DeFiDAO Token',
    tokenSymbol: 'DEFI',
    tokenTotalSupply: 1000000,
    developmentFund: 60000,
    liquidityFund: 40000,
    minTotalContributions: 100000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000) / 1000,
    endTime: (Date.now() + 86400000 * 6) / 1000,
    developerPercent: 15,
    treasuryPercent: 25,
    daoPercent: 60,
    totalContributions: 75000,
    totalShares: 3750000, // Average ~50 weeks lock
    contributors: 42,
    status: 'active',
    developer: '0xdeveloper...1234',
    description: 'Building the next generation DeFi infrastructure with community governance. Our protocol aims to revolutionize how decentralized finance operates by providing seamless integration between traditional financial systems and blockchain technology.'
  },
  {
    id: '2',
    address: '0x5678...9012',
    tokenName: 'GameFi Protocol',
    tokenSymbol: 'GAME',
    tokenTotalSupply: 500000,
    developmentFund: 30000,
    liquidityFund: 20000,
    minTotalContributions: 50000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() + 86400000) / 1000,
    endTime: (Date.now() + 86400000 * 15) / 1000,
    developerPercent: 20,
    treasuryPercent: 20,
    daoPercent: 60,
    totalContributions: 0,
    totalShares: 0,
    contributors: 0,
    status: 'upcoming',
    developer: '0xdeveloper...5678',
    description: 'Decentralized gaming platform with play-to-earn mechanics and NFT integration.'
  },
  {
    id: '3',
    address: '0x9012...3456',
    tokenName: 'SocialDAO',
    tokenSymbol: 'SOCIAL',
    tokenTotalSupply: 2000000,
    developmentFund: 50000,
    liquidityFund: 30000,
    minTotalContributions: 80000,
    fundingToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    fundingTokenSymbol: 'USDT',
    startTime: (Date.now() - 86400000 * 10) / 1000,
    endTime: (Date.now() - 86400000) / 1000,
    developerPercent: 10,
    treasuryPercent: 30,
    daoPercent: 60,
    totalContributions: 125000,
    totalShares: 8750000, // Average ~70 weeks lock
    contributors: 89,
    status: 'launched',
    developer: '0xdeveloper...9012',
    description: 'Community-driven social media platform with decentralized content moderation.'
  },
  {
    id: '4',
    address: '0x1111122223333444455556666777788889999aaaa',
    tokenName: 'AI Trading Bot',
    tokenSymbol: 'AITRADE',
    tokenTotalSupply: 10000000,
    developmentFund: 150000,
    liquidityFund: 50000,
    minTotalContributions: 200000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000 * 20) / 1000,
    endTime: (Date.now() - 86400000 * 2) / 1000,
    developerPercent: 15,
    treasuryPercent: 25,
    daoPercent: 60,
    totalContributions: 250000,
    totalShares: 20000000, // Average ~80 weeks lock
    contributors: 156,
    status: 'success-pending',
    developer: '0xdeveloper...1111',
    description: 'Autonomous AI-powered trading bot with machine learning capabilities for DeFi.'
  },
  {
    id: '5',
    address: '0x3333444455556666777788889999aaaabbbbcccc',
    tokenName: 'Green Energy DAO',
    tokenSymbol: 'GREEN',
    tokenTotalSupply: 5000000,
    developmentFund: 100000,
    liquidityFund: 50000,
    minTotalContributions: 150000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000 * 15) / 1000,
    endTime: (Date.now() - 86400000 * 3) / 1000,
    developerPercent: 12,
    treasuryPercent: 28,
    daoPercent: 60,
    totalContributions: 180000,
    totalShares: 14400000, // Average ~80 weeks lock
    contributors: 92,
    status: 'deploying',
    developer: '0xdeveloper...3333',
    description: 'Sustainable energy projects funding through blockchain technology and carbon credits.'
  }
]

interface PoolPageProps {
  address: string
}

function formatTimeRemaining(endTime: number): string {
  const now = Date.now() / 1000
  const timeLeft = endTime - now
  
  if (timeLeft <= 0) return 'Ended'
  
  const days = Math.floor(timeLeft / (24 * 60 * 60))
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60))
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`
  return `${hours} hour${hours !== 1 ? 's' : ''} left`
}

function getStatusColor(status: Pool['status']): string {
  switch (status) {
    case 'upcoming':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'success-pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'deploying':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'launched':
      return 'bg-primary/20 text-primary border-primary/30'
    default:
      return 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
  }
}

export function PoolPage({ address }: PoolPageProps) {
  const router = useRouter()
  const [pool, setPool] = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading and finding pool by address
    // Handle both full addresses and shortened addresses from mock data
    const foundPool = mockPools.find(p => 
      p.address === address || 
      p.address.toLowerCase() === address.toLowerCase() ||
      address.toLowerCase().includes(p.address.toLowerCase()) ||
      p.address.toLowerCase().includes(address.toLowerCase())
    )
    
    // Simulate API delay
    setTimeout(() => {
      setPool(foundPool || null)
      setLoading(false)
    }, 500)
  }, [address])

  // Redirect to project page if launched
  useEffect(() => {
    if (pool?.status === 'launched') {
      router.push(`/projects/${address}`)
    }
  }, [pool, address, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-muted rounded"></div>
                <div className="h-48 bg-muted rounded"></div>
              </div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Card className="text-center py-12">
            <CardContent>
              <h1 className="text-2xl font-bold mb-4">Pool Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The pool at address {address} could not be found.
              </p>
              <Button onClick={() => router.push('/pools')}>
                Browse All Pools
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const progressPercentage = Math.min(
    (pool.totalContributions / pool.minTotalContributions) * 100,
    100
  )

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pool Header */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-3xl mb-2">{pool.tokenName}</CardTitle>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-sm border-primary/30 bg-primary/5">
                        {pool.tokenSymbol}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-sm ${getStatusColor(pool.status)}`}
                      >
                        {pool.status === 'success-pending' ? 'Success - Pending Deploy' : pool.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {pool.address}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-foreground leading-relaxed">
                  {pool.description}
                </p>
              </CardContent>
            </Card>

            {/* Pool Status Content */}
            {pool.status === 'active' ? (
              <ContributionInterface pool={pool} />
            ) : pool.status === 'success-pending' || pool.status === 'deploying' ? (
              <DeploymentWizard pool={pool} />
            ) : (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle>
                    {pool.status === 'upcoming' ? 'Funding Starts Soon' :
                     pool.status === 'failed' ? 'Funding Failed' :
                     'Pool Status'
                    }
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  {pool.status === 'upcoming' && (
                    <div className="text-center py-8">
                      <p className="text-lg mb-4">
                        Funding will begin soon. You can bookmark this pool to get notified.
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Starts: {new Date(pool.startTime * 1000).toLocaleDateString()}
                      </p>
                      <Button variant="outline" className="btn-outline-custom">
                        Notify Me
                      </Button>
                    </div>
                  )}
                  
                  {pool.status === 'failed' && (
                    <div className="text-center py-8">
                      <p className="text-lg mb-4">
                        This funding round did not reach its minimum target.
                      </p>
                      <p className="text-muted-foreground mb-6">
                        Raised ${pool.totalContributions.toLocaleString()} of ${pool.minTotalContributions.toLocaleString()} goal
                      </p>
                      <Button variant="outline" className="btn-outline-custom">
                        View Details
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
                    <p className="font-medium">{pool.tokenTotalSupply.toLocaleString()} {pool.tokenSymbol}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Funding Token</span>
                    <p className="font-medium">{pool.fundingTokenSymbol}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Development Fund</span>
                    <p className="font-medium">{pool.developmentFund.toLocaleString()} {pool.fundingTokenSymbol}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Liquidity Fund</span>
                    <p className="font-medium">{pool.liquidityFund.toLocaleString()} {pool.fundingTokenSymbol}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Developer</span>
                    <p className="font-mono text-sm break-all">{pool.developer}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <span className="text-muted-foreground text-sm">Allocation Percentages</span>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-center p-2 bg-secondary/20 rounded">
                      <div className="text-sm font-medium">{pool.developerPercent}%</div>
                      <div className="text-xs text-muted-foreground">Developer</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/20 rounded">
                      <div className="text-sm font-medium">{pool.treasuryPercent}%</div>
                      <div className="text-xs text-muted-foreground">Treasury</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/20 rounded">
                      <div className="text-sm font-medium">{pool.daoPercent}%</div>
                      <div className="text-xs text-muted-foreground">DAO</div>
                    </div>
                  </div>
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
                    <span className="font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/60 shadow-inner">
                    <div 
                      className={`h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ${
                        pool.status === 'active' ? 'animate-pulse-slow shadow-sm shadow-primary/50' : ''
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Stats Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-medium">{pool.totalContributions.toLocaleString()} {pool.fundingTokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Goal</span>
                    <span className="font-medium">{pool.minTotalContributions.toLocaleString()} {pool.fundingTokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Shares</span>
                    <span className="font-medium">{pool.totalShares.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Lock Duration</span>
                    <span className="font-medium">
                      {pool.totalShares > 0 ? (pool.totalShares / pool.totalContributions).toFixed(1) : '0'} weeks
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contributors</span>
                    <span className="font-medium flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {pool.contributors}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span className="font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTimeRemaining(pool.endTime)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pool Timeline */}
            <PoolTimeline pool={pool} />
          </div>
        </div>

        {/* Full Width Contributor List */}
        <div className="mt-8">
          <ContributorList pool={pool} />
        </div>
      </div>
    </div>
  )
}
