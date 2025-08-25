'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Globe, Twitter, Github, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Project } from '@/types/project'
import { ProswapInterface } from './proswap-interface'
import { ProlendInterface } from './prolend-interface'
import { GovernanceInterface } from './governance-interface'
import { VeNFTClaimInterface } from '../pools/venft-claim-interface'
import { Pool } from '@/types/pool'
import { PageLoadingSpinner } from '@/components/ui/loading-spinner'
import { PageErrorDisplay } from '@/components/ui/error-boundary'
import { useLaunchedProject } from '@/hooks/useLaunchedProjects'

// Mock data - will be replaced with real contract data (keeping for fallback)
const mockProjects: Project[] = [
  {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    name: 'DeFi Nexus',
    symbol: 'DEFI',
    description: 'Next-generation DeFi infrastructure with automated yield farming and cross-chain capabilities. Our protocol combines the best of traditional DeFi with innovative features like auto-compounding vaults, cross-chain bridges, and governance-driven strategy optimization.',
    category: 'defi',
    launchDate: Date.now() / 1000 - 86400 * 30, // 30 days ago
    fundingRaised: 150000,
    fundingTokenSymbol: 'USDC',
    totalSupply: 1000000,
    tokenPrice: 2.45,
    marketCap: 2450000,
    totalValueLocked: 850000,
    volume24h: 125000,
    holders: 1250,
    tokenAddress: '0xtoken1234567890123456789012345678901234567890',
    pairAddress: '0xpair1234567890123456789012345678901234567890',
    lendingAddress: '0xlend1234567890123456789012345678901234567890',
    governanceAddress: '0xgov1234567890123456789012345678901234567890',
    website: 'https://definexus.com',
    twitter: 'https://twitter.com/definexus',
    github: 'https://github.com/definexus',
    discord: 'https://discord.gg/definexus',
    priceChange24h: 8.5,
    priceChange7d: -2.3,
    allTimeHigh: 3.20,
    allTimeLow: 1.80
  },
  {
    id: '2', 
    address: '0x2345678901234567890123456789012345678901',
    name: 'AI Trading Protocol',
    symbol: 'AITP',
    description: 'Autonomous trading strategies powered by machine learning and on-chain analytics. Our AI-driven approach analyzes market conditions in real-time to optimize trading decisions and maximize returns for users.',
    category: 'ai',
    launchDate: Date.now() / 1000 - 86400 * 15, // 15 days ago
    fundingRaised: 80000,
    fundingTokenSymbol: 'USDC',
    totalSupply: 500000,
    tokenPrice: 1.92,
    marketCap: 960000,
    totalValueLocked: 420000,
    volume24h: 85000,
    holders: 890,
    tokenAddress: '0xtoken2345678901234567890123456789012345678901',
    pairAddress: '0xpair2345678901234567890123456789012345678901',
    website: 'https://aitp.finance',
    twitter: 'https://twitter.com/aitpfinance',
    priceChange24h: -3.2,
    priceChange7d: 12.8,
    allTimeHigh: 2.15,
    allTimeLow: 1.50
  },
  {
    id: '3',
    address: '0x3456789012345678901234567890123456789012', 
    name: 'GameChain Studios',
    symbol: 'GAME',
    description: 'Web3 gaming platform with play-to-earn mechanics and NFT marketplace integration. Build, trade, and earn in our ecosystem of interconnected games with true asset ownership.',
    category: 'gaming',
    launchDate: Date.now() / 1000 - 86400 * 45, // 45 days ago
    fundingRaised: 200000,
    fundingTokenSymbol: 'USDT',
    totalSupply: 2000000,
    tokenPrice: 0.85,
    marketCap: 1700000,
    totalValueLocked: 620000,
    volume24h: 95000,
    holders: 2150,
    tokenAddress: '0xtoken3456789012345678901234567890123456789012',
    pairAddress: '0xpair3456789012345678901234567890123456789012',
    governanceAddress: '0xgov3456789012345678901234567890123456789012',
    website: 'https://gamechain.studios',
    twitter: 'https://twitter.com/gamechain',
    discord: 'https://discord.gg/gamechain',
    priceChange24h: 15.2,
    priceChange7d: 28.5,
    allTimeHigh: 1.20,
    allTimeLow: 0.65
  }
]

interface ProjectPageProps {
  address: string
}

// Helper function to convert Project to Pool for veNFT claiming
function finalProjectToPool(finalProject: Project): Pool {
  return {
    id: finalProject.id,
    address: finalProject.address,
    tokenName: finalProject.name,
    tokenSymbol: finalProject.symbol,
    tokenTotalSupply: finalProject.totalSupply,
    developmentFund: finalProject.fundingRaised * 0.6, // Estimate based on typical allocation
    liquidityFund: finalProject.fundingRaised * 0.4,
    minTotalContributions: finalProject.fundingRaised,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e', // Mock USDC address
    fundingTokenSymbol: finalProject.fundingTokenSymbol,
    startTime: finalProject.launchDate - 86400 * 30, // 30 days before launch
    endTime: finalProject.launchDate - 86400 * 2, // 2 days before launch
    developerPercent: 15,
    treasuryPercent: 25,
    daoPercent: 60,
    totalContributions: finalProject.fundingRaised,
    totalShares: finalProject.fundingRaised * 50, // Estimate average 50 week lock
    contributors: Math.floor(finalProject.holders * 0.3), // Estimate 30% of holders contributed
    status: 'launched' as const,
    developer: '0xdeveloper...1234',
    description: finalProject.description
  }
}

function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(decimals)}M`
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(decimals)}K`
  }
  return `$${num.toFixed(decimals)}`
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp
  const days = Math.floor(diff / (24 * 60 * 60))
  
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'defi':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'ai':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'gaming':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'social':
      return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    case 'infrastructure':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

export function ProjectPage({ address }: ProjectPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial tab from URL params or default to trade
  const initialTab = searchParams.get('tab') || 'trade'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Use real launched project data
  const { project, isLoading: loading, error } = useLaunchedProject(address)

  // Fallback to mock data if no real project found (for demo purposes)
  const fallbackProject = mockProjects.find(p => 
    p.address.toLowerCase() === address.toLowerCase() ||
    p.address.slice(0, 10) === address.slice(0, 10) // Handle shortened addresses
  )

  const finalProject = project || fallbackProject

  if (loading) {
    return <PageLoadingSpinner text="Loading project details..." />
  }

  if (!finalProject) {
    return (
      <PageErrorDisplay
        error={error || `Project at address ${address} not found`}
        title="Project Not Found"
        description="The finalProject you're looking for doesn't exist or may have been removed."
        onRetry={() => window.location.reload()}
      />
    )
  }

  const priceChangeIsPositive = finalProject.priceChange24h >= 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/finalProjects')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        {/* Project Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h1 className="text-3xl font-bold gradient-text">{finalProject.name}</h1>
                <Badge variant="outline" className="text-sm font-medium">
                  {finalProject.symbol}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-sm font-medium ${getCategoryColor(finalProject.category)}`}
                >
                  {finalProject.category.toUpperCase()}
                </Badge>
              </div>
              
              <p className="text-foreground text-lg mb-4 max-w-3xl">
                {finalProject.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Launched {formatTimeAgo(finalProject.launchDate)}</span>
                <span>•</span>
                <span>{finalProject.holders.toLocaleString()} holders</span>
                <span>•</span>
                <span>{formatNumber(finalProject.fundingRaised)} raised</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-3">
              {finalProject.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={finalProject.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
              {finalProject.twitter && (
                <Button variant="outline" size="sm" asChild>
                  <a href={finalProject.twitter} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </a>
                </Button>
              )}
              {finalProject.github && (
                <Button variant="outline" size="sm" asChild>
                  <a href={finalProject.github} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    Github
                  </a>
                </Button>
              )}
              {finalProject.discord && (
                <Button variant="outline" size="sm" asChild>
                  <a href={finalProject.discord} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Discord
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics & Project Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Price & Performance */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-accent">Price & Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold">${finalProject.tokenPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {priceChangeIsPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${priceChangeIsPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChangeIsPositive ? '+' : ''}{finalProject.priceChange24h.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNumber(finalProject.marketCap)}</p>
                  <p className="text-xs text-muted-foreground">Market Cap</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div className="text-center">
                  <p className="text-sm font-medium">${finalProject.allTimeHigh.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">All Time High</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">${finalProject.allTimeLow.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">All Time Low</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Protocol Stats */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-accent">Protocol Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNumber(finalProject.totalValueLocked)}</p>
                  <p className="text-xs text-muted-foreground">Total Value Locked</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNumber(finalProject.volume24h)}</p>
                  <p className="text-xs text-muted-foreground">24h Volume</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div className="text-center">
                  <p className="text-sm font-medium">{finalProject.holders.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Token Holders</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{finalProject.totalSupply.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Supply</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funding History */}
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-accent">Funding History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-xl font-bold text-accent">{formatNumber(finalProject.fundingRaised)}</p>
                <p className="text-xs text-muted-foreground">Total Raised in {finalProject.fundingTokenSymbol}</p>
              </div>
              <div className="pt-2 border-t border-border/30 text-center">
                <p className="text-sm font-medium">{formatTimeAgo(finalProject.launchDate)}</p>
                <p className="text-xs text-muted-foreground">Launch Date</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* veNFT Claim Interface - Show if user has unclaimed positions */}
        <VeNFTClaimInterface pool={finalProjectToPool(finalProject)} />

        {/* DeFi Interface Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
            <TabsTrigger 
              value="trade"
              className="relative transition-all duration-300 ease-in-out hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Trade
            </TabsTrigger>
            <TabsTrigger 
              value="lend"
              className="relative transition-all duration-300 ease-in-out hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Lend/Borrow
            </TabsTrigger>
            <TabsTrigger 
              value="govern"
              className="relative transition-all duration-300 ease-in-out hover:bg-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              DAO Governance
            </TabsTrigger>
          </TabsList>

          <div className="relative min-h-[400px]">
            <TabsContent 
              value="trade" 
              className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
            >
              <ProswapInterface project={finalProject} />
            </TabsContent>

            <TabsContent 
              value="lend" 
              className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
            >
              <ProlendInterface project={finalProject} />
            </TabsContent>

            <TabsContent 
              value="govern" 
              className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
            >
              <GovernanceInterface project={finalProject} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}


