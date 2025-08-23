'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Rocket, ArrowUpDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { PoolCard } from './pool-card'
import { Pool, PoolFilters } from '@/types/pool'
import { LoadingSpinner, CardLoadingSkeleton } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { useLoadingState } from '@/hooks/useLoadingState'

// Mock data for now - will be replaced with real contract data
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
    startTime: (Date.now() - 86400000) / 1000, // 1 day ago (in seconds)
    endTime: (Date.now() + 86400000 * 6) / 1000, // 6 days from now (in seconds)
    developerPercent: 15,
    treasuryPercent: 25,
    daoPercent: 60,
    totalContributions: 75000,
    totalShares: 3750000, // Average ~50 weeks lock
    contributors: 42,
    status: 'active',
    developer: '0xdeveloper...1234',
    description: 'Building the next generation DeFi infrastructure with community governance.'
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
    startTime: (Date.now() + 86400000) / 1000, // 1 day from now (in seconds)
    endTime: (Date.now() + 86400000 * 15) / 1000, // 15 days from now (in seconds)
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
    startTime: (Date.now() - 86400000 * 10) / 1000, // 10 days ago (in seconds)
    endTime: (Date.now() - 86400000) / 1000, // 1 day ago (in seconds)
    developerPercent: 10,
    treasuryPercent: 30,
    daoPercent: 60,
    totalContributions: 125000,
    totalShares: 8750000, // Average ~70 weeks lock
    contributors: 89,
    status: 'launched',
    developer: '0xdeveloper...9012',
    description: 'Community-driven social media platform with decentralized content moderation.',
    tokenAddress: '0xtoken...9012',
    pairAddress: '0xpair...9012'
  },
  {
    id: '4',
    address: '0xabcd...efgh',
    tokenName: 'MetaVerse Protocol',
    tokenSymbol: 'META',
    tokenTotalSupply: 20000000,
    developmentFund: 70000,
    liquidityFund: 30000,
    minTotalContributions: 100000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000 * 30) / 1000, // 30 days ago (in seconds)
    endTime: (Date.now() - 86400000 * 5) / 1000, // 5 days ago (in seconds)
    developerPercent: 25,
    treasuryPercent: 15,
    daoPercent: 60,
    totalContributions: 15000,
    totalShares: 600000, // Average ~40 weeks lock
    contributors: 8,
    status: 'failed',
    developer: '0xdeveloper...abcd',
    description: 'Virtual reality metaverse platform with NFT integration and digital land ownership.'
  },
  {
    id: '5',
    address: '0x1111122223333444455556666777788889999aaaa',
    tokenName: 'AI Trading Bot',
    tokenSymbol: 'AITRADE',
    tokenTotalSupply: 10000000,
    developmentFund: 150000,
    liquidityFund: 50000,
    minTotalContributions: 200000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000 * 20) / 1000, // 20 days ago (in seconds)
    endTime: (Date.now() - 86400000 * 2) / 1000, // 2 days ago (in seconds)
    developerPercent: 15,
    treasuryPercent: 25,
    daoPercent: 60,
    totalContributions: 250000,
    totalShares: 20000000, // Average ~80 weeks lock
    contributors: 156,
    status: 'deploying',
    developer: '0xdeveloper...1111',
    description: 'Autonomous AI-powered trading bot with machine learning capabilities for DeFi.'
  },
  {
    id: '6',
    address: '0x3333444455556666777788889999aaaabbbbcccc',
    tokenName: 'Green Energy DAO',
    tokenSymbol: 'GREEN',
    tokenTotalSupply: 5000000,
    developmentFund: 100000,
    liquidityFund: 50000,
    minTotalContributions: 150000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000 * 15) / 1000, // 15 days ago (in seconds)
    endTime: (Date.now() - 86400000 * 3) / 1000, // 3 days ago (in seconds)
    developerPercent: 12,
    treasuryPercent: 28,
    daoPercent: 60,
    totalContributions: 180000,
    totalShares: 14400000, // Average ~80 weeks lock
    contributors: 92,
    status: 'deploying',
    developer: '0xdeveloper...3333',
    description: 'Sustainable energy projects funding through blockchain technology and carbon credits.'
  },
  {
    id: '7',
    address: '0x4444555566667777888899990000aaaabbbbcccc',
    tokenName: 'MetaVerse Builder',
    tokenSymbol: 'MVRS',
    tokenTotalSupply: 1500000,
    developmentFund: 80000,
    liquidityFund: 60000,
    minTotalContributions: 140000,
    fundingToken: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    fundingTokenSymbol: 'USDC',
    startTime: (Date.now() - 86400000 * 30) / 1000, // 30 days ago
    endTime: (Date.now() - 86400000 * 2) / 1000, // 2 days ago (ended)
    developerPercent: 18,
    treasuryPercent: 22,
    daoPercent: 60,
    totalContributions: 95000, // Failed to reach 140k minimum
    totalShares: 4750000, // Average ~50 weeks lock
    contributors: 67,
    status: 'failed',
    developer: '0xdeveloper...4444',
    description: 'Building immersive virtual worlds and metaverse experiences with decentralized governance.'
  }
]



export function PoolDiscovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<PoolFilters['status']>('all')
  const [sortBy, setSortBy] = useState<PoolFilters['sortBy']>('recent')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const { isLoading, error, data: pools, execute } = useLoadingState<Pool[]>([])

  // Simulate loading pools from contract
  const loadPools = async () => {
    // Simulate API delay and potential errors
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Simulate random error for demo (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('Failed to fetch pools from ProratedFactory contract')
    }
    
    return mockPools
  }

  useEffect(() => {
    execute(loadPools)
  }, [execute])

  // Filter and sort pools based on current selections
  const filteredPools = (pools || [])
    .filter((pool: Pool) => {
      // Apply all filters simultaneously
      let matchesSearch = true
      let matchesStatus = true

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        matchesSearch = (
          pool.tokenName.toLowerCase().includes(query) ||
          pool.tokenSymbol.toLowerCase().includes(query) ||
          pool.description.toLowerCase().includes(query) ||
          pool.developer.toLowerCase().includes(query)
        )
      }

      // Status filter
      if (selectedStatus !== 'all') {
        matchesStatus = pool.status === selectedStatus
      }

      return matchesSearch && matchesStatus
    })
    .sort((a: Pool, b: Pool) => {
      // Sort logic
      switch (sortBy) {
        case 'ending-soon':
          // Active pools first, then by end time (soonest first)
          if (a.status === 'active' && b.status !== 'active') return -1
          if (b.status === 'active' && a.status !== 'active') return 1
          return a.endTime - b.endTime

        case 'most-funded':
          return b.totalContributions - a.totalContributions
          
        case 'least-funded':
          return a.totalContributions - b.totalContributions
          
        case 'most-contributors':
          return b.contributors - a.contributors
          
        case 'funding-progress':
          // Sort by funding percentage completion
          const aProgress = (a.totalContributions / a.minTotalContributions) * 100
          const bProgress = (b.totalContributions / b.minTotalContributions) * 100
          return bProgress - aProgress
          
        case 'recent':
        default:
          return b.startTime - a.startTime
      }
    })

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Pools</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Token name, symbol, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Separator />

      {/* Status Filter */}
      <div className="space-y-3">
        <Label>Pool Status</Label>
        <Select value={selectedStatus} onValueChange={(value: PoolFilters['status']) => setSelectedStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pools</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="deploying">Deploying</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="launched">Launched</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Sort Options */}
      <div className="space-y-3">
        <Label>Sort By</Label>
        <Select value={sortBy} onValueChange={(value: PoolFilters['sortBy']) => setSortBy(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="ending-soon">Ending Soon</SelectItem>
            <SelectItem value="funding-progress">Funding Progress</SelectItem>
            <SelectItem value="most-funded">Most Funded ($)</SelectItem>
            <SelectItem value="least-funded">Least Funded ($)</SelectItem>
            <SelectItem value="most-contributors">Most Contributors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Quick Stats */}
      <div className="space-y-3">
        <Label>Quick Stats</Label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div 
            className="text-center p-2 bg-gradient-to-br from-primary/10 to-accent/10 rounded hover:from-primary/20 hover:to-accent/20 transition-all duration-300 group cursor-pointer border border-border/30 hover:border-primary/40"
            onClick={() => setSelectedStatus('active')}
          >
            <div className="font-semibold text-accent group-hover:scale-110 transition-transform duration-300">{(pools || []).filter((p: Pool) => p.status === 'active').length}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div 
            className="text-center p-2 bg-gradient-to-br from-accent/10 to-primary/10 rounded hover:from-accent/20 hover:to-primary/20 transition-all duration-300 group cursor-pointer border border-border/30 hover:border-accent/40"
            onClick={() => setSelectedStatus('upcoming')}
          >
            <div className="font-semibold text-accent group-hover:scale-110 transition-transform duration-300">{(pools || []).filter((p: Pool) => p.status === 'upcoming').length}</div>
            <div className="text-muted-foreground">Upcoming</div>
          </div>
          <div 
            className="text-center p-2 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded hover:from-green-500/20 hover:to-emerald-500/20 transition-all duration-300 group cursor-pointer border border-border/30 hover:border-green-500/40"
            onClick={() => setSelectedStatus('launched')}
          >
            <div className="font-semibold text-green-400 group-hover:scale-110 transition-transform duration-300">{(pools || []).filter((p: Pool) => p.status === 'launched').length}</div>
            <div className="text-muted-foreground">Launched</div>
          </div>
          <div 
            className="text-center p-2 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded hover:from-red-500/20 hover:to-orange-500/20 transition-all duration-300 group cursor-pointer border border-border/30 hover:border-red-500/40"
            onClick={() => setSelectedStatus('failed')}
          >
            <div className="font-semibold text-red-400 group-hover:scale-110 transition-transform duration-300">{(pools || []).filter((p: Pool) => p.status === 'failed').length}</div>
            <div className="text-muted-foreground">Failed</div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Clear Filters */}
      <div className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            setSearchQuery('')
            setSelectedStatus('all')
            setSortBy('recent')
          }}
          className="w-full"
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-accent" />
      {/* Page Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-float" />
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight gradient-text">Discover Fundraising Pools</h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => execute(loadPools)}
                  disabled={isLoading}
                  className="hidden md:flex"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <p className="text-foreground">
                Browse active and upcoming DAO fundraising campaigns. Support projects you believe in.
              </p>
            </div>
            
            {/* Mobile filter toggle */}
            <div className="flex items-center space-x-2 md:hidden">
              <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="py-6">
                    <h3 className="text-lg font-semibold mb-4">Filter Pools</h3>
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="text-sm text-muted-foreground">
                {filteredPools.length} pool{filteredPools.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <Card className="border-border glass bg-card backdrop-blur-md shadow-2xl border-2 ring-1 ring-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-accent">
                    <Filter className="h-5 w-5 text-primary" />
                    <span>Filter Pools</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FilterSidebar />
                </CardContent>
              </Card>
              
              {/* Pool Count - moved from main content */}
              <div className="mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPools.length} of {mockPools.length} pool{filteredPools.length !== 1 ? 's' : ''}
                  {selectedStatus !== 'all' && (
                    <span className="text-accent font-medium"> ({selectedStatus})</span>
                  )}
                  {searchQuery && (
                    <span className="text-primary font-medium"> matching &ldquo;{searchQuery}&rdquo;</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pool Grid */}
          <div className="lg:col-span-3">
            {/* Results Header with Quick Sort */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                <span>Sorted by:</span>
                <span className="text-accent font-medium">
                  {sortBy === 'ending-soon' ? 'Ending Soon' :
                   sortBy === 'most-funded' ? 'Most Funded' :
                   sortBy === 'least-funded' ? 'Least Funded' :
                   sortBy === 'most-contributors' ? 'Most Contributors' :
                   sortBy === 'funding-progress' ? 'Funding Progress' :
                   'Most Recent'
                  }
                </span>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Quick sort:</span>
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={`text-xs h-7 ${sortBy === 'recent' ? 'btn-primary-custom' : 'btn-outline-custom'}`}
                >
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'ending-soon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('ending-soon')}
                  className={`text-xs h-7 ${sortBy === 'ending-soon' ? 'btn-primary-custom' : 'btn-outline-custom'}`}
                >
                  Ending Soon
                </Button>
                <Button
                  variant={sortBy === 'funding-progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('funding-progress')}
                  className={`text-xs h-7 ${sortBy === 'funding-progress' ? 'btn-primary-custom' : 'btn-outline-custom'}`}
                >
                  Progress
                </Button>
              </div>
            </div>
            
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6">
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" text="Loading pools from blockchain..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                      <CardContent className="p-6">
                        <CardLoadingSkeleton />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="py-8">
                <ErrorDisplay
                  error={error}
                  title="Failed to load pools"
                  description="We couldn't fetch the latest pools from the blockchain. Please try again."
                  onRetry={() => execute(loadPools)}
                  variant="destructive"
                />
              </div>
            )}

            {/* Pool Cards Grid */}
            {!isLoading && !error && filteredPools.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPools.map((pool: Pool) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredPools.length === 0 && pools && pools.length > 0 && (
              /* Filtered empty state */
              <div className="text-center py-12">
                <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pools found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters.
                </p>
                <Button onClick={() => {
                  setSearchQuery('')
                  setSelectedStatus('all')
                }} variant="outline">
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
