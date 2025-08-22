'use client'

import { useState } from 'react'
import { Search, Filter, TrendingUp, Zap, ArrowUpDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ProjectCard } from './project-card'
import { Project, ProjectFilters } from '@/types/project'
import { getTokenSymbol } from '@/lib/token-utils'

// Mock data for launched projects - will be replaced with real contract data
const mockProjects: Project[] = [
  {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    name: 'DeFi Nexus',
    symbol: 'DEFI',
    description: 'Next-generation DeFi infrastructure with automated yield farming and cross-chain capabilities.',
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
    description: 'Autonomous trading strategies powered by machine learning and on-chain analytics.',
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
    description: 'Web3 gaming platform with play-to-earn mechanics and NFT marketplace integration.',
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

export function ProjectDiscovery() {
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    category: 'all',
    sortBy: 'newest'
  })

  // Apply filters and sorting
  const filteredProjects = mockProjects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                          project.symbol.toLowerCase().includes(filters.search.toLowerCase()) ||
                          project.description.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesCategory = filters.category === 'all' || project.category === filters.category
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.launchDate - a.launchDate
        case 'oldest':
          return a.launchDate - b.launchDate
        case 'market-cap':
          return b.marketCap - a.marketCap
        case 'tvl':
          return b.totalValueLocked - a.totalValueLocked
        case 'volume':
          return b.volume24h - a.volume24h
        case 'price-change':
          return b.priceChange24h - a.priceChange24h
        default:
          return 0
      }
    })

  // Get category counts for quick stats
  const categoryStats = {
    all: mockProjects.length,
    defi: mockProjects.filter(p => p.category === 'defi').length,
    ai: mockProjects.filter(p => p.category === 'ai').length,
    gaming: mockProjects.filter(p => p.category === 'gaming').length,
    social: mockProjects.filter(p => p.category === 'social').length,
    infrastructure: mockProjects.filter(p => p.category === 'infrastructure').length
  }

  const totalMarketCap = mockProjects.reduce((sum, p) => sum + p.marketCap, 0)
  const totalTVL = mockProjects.reduce((sum, p) => sum + p.totalValueLocked, 0)
  const totalVolume24h = mockProjects.reduce((sum, p) => sum + p.volume24h, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,119,198,0.1),transparent_50%)]" />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Launched Projects
          </h1>
          <p className="text-lg text-foreground max-w-3xl mx-auto">
            Discover successful DAOs that have completed funding and deployed their tokens. 
            Trade, lend, and participate in governance across the Prorated ecosystem.
          </p>
        </div>

        {/* Protocol Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-accent">{mockProjects.length}</p>
              <p className="text-sm text-muted-foreground">Launched Projects</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-accent">${(totalMarketCap / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-muted-foreground">Total Market Cap</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-accent">${(totalTVL / 1000000).toFixed(1)}M</p>
              <p className="text-sm text-muted-foreground">Total Value Locked</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-6 text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-accent">${(totalVolume24h / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">24h Volume</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full btn-outline-custom">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter Projects
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <FilterSidebar 
                    filters={filters} 
                    setFilters={setFilters} 
                    categoryStats={categoryStats}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:block">
              <FilterSidebar 
                filters={filters} 
                setFilters={setFilters} 
                categoryStats={categoryStats}
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredProjects.length} of {mockProjects.length} projects
                  {filters.category !== 'all' && ` in ${filters.category}`}
                  {filters.search && ` matching "${filters.search}"`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No projects found matching your criteria.</p>
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ search: '', category: 'all', sortBy: 'newest' })}
                  className="mt-4 btn-outline-custom"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FilterSidebarProps {
  filters: ProjectFilters
  setFilters: (filters: ProjectFilters) => void
  categoryStats: Record<string, number>
}

function FilterSidebar({ filters, setFilters, categoryStats }: FilterSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Search Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, symbol, or description..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Category Stats */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(categoryStats).map(([category, count]) => (
            <Button
              key={category}
              variant={filters.category === category ? "default" : "ghost"}
              onClick={() => setFilters({ ...filters, category: category as ProjectFilters['category'] })}
              className={`w-full justify-between ${
                filters.category === category ? 'btn-primary-custom' : ''
              }`}
            >
              <span className="capitalize">{category}</span>
              <span className="text-sm opacity-75">{count}</span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Sort Options */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <ArrowUpDown className="h-4 w-4" />
            <span>Sort By</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={filters.sortBy} onValueChange={(value) => setFilters({ ...filters, sortBy: value as ProjectFilters['sortBy'] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest Launch</SelectItem>
              <SelectItem value="oldest">Oldest Launch</SelectItem>
              <SelectItem value="market-cap">Market Cap</SelectItem>
              <SelectItem value="tvl">Total Value Locked</SelectItem>
              <SelectItem value="volume">24h Volume</SelectItem>
              <SelectItem value="price-change">Price Change</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Clear Filters */}
      <Button 
        variant="outline" 
        onClick={() => setFilters({ search: '', category: 'all', sortBy: 'newest' })}
        className="w-full btn-outline-custom"
      >
        Clear All Filters
      </Button>
    </div>
  )
}
