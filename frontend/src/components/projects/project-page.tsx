'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, ExternalLink, Globe, Twitter, Github, MessageCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Project } from '@/types/project'
import { ProswapInterface } from './proswap-interface'
import { ProlendInterface } from './prolend-interface'
import { GovernanceInterface } from './governance-interface'
import { getTokenSymbol } from '@/lib/token-utils'

// Mock data - will be replaced with real contract data
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
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // Get initial tab from URL params or default to trade
  const initialTab = searchParams.get('tab') || 'trade'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    // Simulate loading and finding project by address
    const foundProject = mockProjects.find(p => 
      p.address.toLowerCase() === address.toLowerCase() ||
      p.address.slice(0, 10) === address.slice(0, 10) // Handle shortened addresses
    )
    
    setTimeout(() => {
      setProject(foundProject || null)
      setLoading(false)
    }, 500)
  }, [address])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,119,198,0.1),transparent_50%)]" />
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Project not found</h1>
            <p className="text-muted-foreground mb-6">
              The project with address {address} does not exist.
            </p>
            <Button onClick={() => router.push('/projects')} className="btn-outline-custom">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const fundingTokenSymbol = getTokenSymbol(project.fundingTokenSymbol)
  const priceChangeIsPositive = project.priceChange24h >= 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/projects')}
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
                <h1 className="text-3xl font-bold gradient-text">{project.name}</h1>
                <Badge variant="outline" className="text-sm font-medium">
                  {project.symbol}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-sm font-medium ${getCategoryColor(project.category)}`}
                >
                  {project.category.toUpperCase()}
                </Badge>
              </div>
              
              <p className="text-foreground text-lg mb-4 max-w-3xl">
                {project.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Launched {formatTimeAgo(project.launchDate)}</span>
                <span>•</span>
                <span>{project.holders.toLocaleString()} holders</span>
                <span>•</span>
                <span>{formatNumber(project.fundingRaised)} raised</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-3">
              {project.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={project.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
              {project.twitter && (
                <Button variant="outline" size="sm" asChild>
                  <a href={project.twitter} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </a>
                </Button>
              )}
              {project.github && (
                <Button variant="outline" size="sm" asChild>
                  <a href={project.github} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    Github
                  </a>
                </Button>
              )}
              {project.discord && (
                <Button variant="outline" size="sm" asChild>
                  <a href={project.discord} target="_blank" rel="noopener noreferrer">
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
                  <p className="text-xl font-bold">${project.tokenPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Current Price</p>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    {priceChangeIsPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`text-xs ${priceChangeIsPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChangeIsPositive ? '+' : ''}{project.priceChange24h.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNumber(project.marketCap)}</p>
                  <p className="text-xs text-muted-foreground">Market Cap</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div className="text-center">
                  <p className="text-sm font-medium">${project.allTimeHigh.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">All Time High</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">${project.allTimeLow.toFixed(2)}</p>
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
                  <p className="text-xl font-bold">{formatNumber(project.totalValueLocked)}</p>
                  <p className="text-xs text-muted-foreground">Total Value Locked</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{formatNumber(project.volume24h)}</p>
                  <p className="text-xs text-muted-foreground">24h Volume</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div className="text-center">
                  <p className="text-sm font-medium">{project.holders.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Token Holders</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{project.totalSupply.toLocaleString()}</p>
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
                <p className="text-xl font-bold text-accent">{formatNumber(project.fundingRaised)}</p>
                <p className="text-xs text-muted-foreground">Total Raised in {project.fundingTokenSymbol}</p>
              </div>
              <div className="pt-2 border-t border-border/30 text-center">
                <p className="text-sm font-medium">{formatTimeAgo(project.launchDate)}</p>
                <p className="text-xs text-muted-foreground">Launch Date</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
              <ProswapInterface project={project} />
            </TabsContent>

            <TabsContent 
              value="lend" 
              className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
            >
              <ProlendInterface project={project} />
            </TabsContent>

            <TabsContent 
              value="govern" 
              className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
            >
              <GovernanceInterface project={project} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}


