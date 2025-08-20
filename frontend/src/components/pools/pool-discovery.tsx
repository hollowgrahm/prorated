'use client'

import { useState } from 'react'
import { Search, Filter, Clock, Users, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// Mock data for now - will be replaced with real contract data
const mockPools = [
  {
    id: '1',
    address: '0x1234...5678',
    tokenName: 'DeFiDAO Token',
    tokenSymbol: 'DEFI',
    developer: '0xdeveloper...1234',
    status: 'active' as const,
    startTime: Date.now() - 86400000, // 1 day ago
    endTime: Date.now() + 86400000 * 6, // 6 days from now
    totalContributions: 75000,
    minTotalContributions: 100000,
    contributorCount: 42,
    description: 'Building the next generation DeFi infrastructure with community governance.'
  },
  {
    id: '2',
    address: '0x5678...9012',
    tokenName: 'GameFi Protocol',
    tokenSymbol: 'GAME',
    developer: '0xdeveloper...5678',
    status: 'upcoming' as const,
    startTime: Date.now() + 86400000, // 1 day from now
    endTime: Date.now() + 86400000 * 15, // 15 days from now
    totalContributions: 0,
    minTotalContributions: 50000,
    contributorCount: 0,
    description: 'Decentralized gaming platform with play-to-earn mechanics and NFT integration.'
  },
  {
    id: '3',
    address: '0x9012...3456',
    tokenName: 'SocialDAO',
    tokenSymbol: 'SOCIAL',
    developer: '0xdeveloper...9012',
    status: 'success-pending' as const,
    startTime: Date.now() - 86400000 * 10, // 10 days ago
    endTime: Date.now() - 86400000, // 1 day ago
    totalContributions: 125000,
    minTotalContributions: 80000,
    contributorCount: 89,
    description: 'Community-driven social media platform with decentralized content moderation.'
  }
]

type PoolStatus = 'all' | 'active' | 'upcoming' | 'success-pending' | 'failed' | 'launched'
type SortOption = 'recent' | 'ending-soon' | 'funding-progress' | 'contributor-count'

export function PoolDiscovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<PoolStatus>('all')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Filter and sort pools based on current selections
  const filteredPools = mockPools
    .filter(pool => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          pool.tokenName.toLowerCase().includes(query) ||
          pool.tokenSymbol.toLowerCase().includes(query) ||
          pool.description.toLowerCase().includes(query)
        )
      }
      return true
    })
    .filter(pool => {
      // Status filter
      if (selectedStatus === 'all') return true
      return pool.status === selectedStatus
    })
    .sort((a, b) => {
      // Sort logic
      switch (sortBy) {
        case 'ending-soon':
          return a.endTime - b.endTime
        case 'funding-progress':
          return (b.totalContributions / b.minTotalContributions) - (a.totalContributions / a.minTotalContributions)
        case 'contributor-count':
          return b.contributorCount - a.contributorCount
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
        <Select value={selectedStatus} onValueChange={(value: PoolStatus) => setSelectedStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pools</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="success-pending">Success - Pending Deploy</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="launched">Launched</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Sort Options */}
      <div className="space-y-3">
        <Label>Sort By</Label>
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="ending-soon">Ending Soon</SelectItem>
            <SelectItem value="funding-progress">Funding Progress</SelectItem>
            <SelectItem value="contributor-count">Most Contributors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Quick Stats */}
      <div className="space-y-3">
        <Label>Quick Stats</Label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-center p-2 bg-gradient-to-br from-primary/10 to-accent/10 rounded hover:from-primary/20 hover:to-accent/20 transition-all duration-300 group cursor-pointer">
            <div className="font-semibold text-accent group-hover:scale-110 transition-transform duration-300">{mockPools.filter(p => p.status === 'active').length}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-2 bg-gradient-to-br from-accent/10 to-primary/10 rounded hover:from-accent/20 hover:to-primary/20 transition-all duration-300 group cursor-pointer">
            <div className="font-semibold text-accent group-hover:scale-110 transition-transform duration-300">{mockPools.filter(p => p.status === 'upcoming').length}</div>
            <div className="text-muted-foreground">Upcoming</div>
          </div>
        </div>
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
              <h1 className="text-3xl font-bold tracking-tight gradient-text">Discover Fundraising Pools</h1>
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
                  Showing {filteredPools.length} pool{filteredPools.length !== 1 ? 's' : ''}
                  {selectedStatus !== 'all' && ` (${selectedStatus})`}
                </div>
              </div>
            </div>
          </div>

          {/* Pool Grid */}
          <div className="lg:col-span-3">
            {/* Pool Cards Grid */}
            {filteredPools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPools.map((pool) => (
                  <Card key={pool.id} className="group hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 border-border border-2 hover:border-primary/60 relative overflow-hidden bg-card backdrop-blur-sm shadow-lg">
                    {/* Static gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/12" />
                    {/* Animated background gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                    
                    <CardHeader className="pb-3 relative z-10">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{pool.tokenName}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5">
                              {pool.tokenSymbol}
                            </Badge>
                            <Badge 
                              variant={pool.status === 'active' ? 'default' : 'secondary'} 
                              className={`text-xs ${
                                pool.status === 'active' 
                                  ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm shadow-primary/50' 
                                  : ''
                              }`}
                            >
                              {pool.status === 'success-pending' ? 'Success' : pool.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{pool.address.slice(0, 6)}...{pool.address.slice(-4)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4 relative z-10">
                      {/* Description */}
                      <p className="text-sm text-foreground line-clamp-2">{pool.description}</p>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Funding Progress</span>
                          <span className="font-medium">
                            {Math.round((pool.totalContributions / pool.minTotalContributions) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border/60 shadow-inner">
                          <div 
                            className={`h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ${
                              pool.status === 'active' ? 'animate-pulse-slow shadow-sm shadow-primary/50' : ''
                            }`}
                            style={{ 
                              width: `${Math.min((pool.totalContributions / pool.minTotalContributions) * 100, 100)}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>${pool.totalContributions.toLocaleString()} raised</span>
                          <span>${pool.minTotalContributions.toLocaleString()} goal</span>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-primary" />
                          <span className="text-muted-foreground">{pool.contributorCount} contributors</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-primary" />
                          <span className="text-muted-foreground">
                            {pool.status === 'active' 
                              ? `${Math.ceil((pool.endTime - Date.now()) / (86400000))} days left`
                              : pool.status === 'upcoming'
                              ? `Starts in ${Math.ceil((pool.startTime - Date.now()) / (86400000))} days`
                              : 'Ended'
                            }
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Empty State */
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
