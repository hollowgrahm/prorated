'use client'

import { useState } from 'react'
import { Search, Filter, Rocket, ArrowUpDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { PoolCard } from './pool-card'
import { PoolFilters, PoolStatus } from '@/types'
import { LoadingSpinner, CardLoadingSkeleton } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { useFilteredPools, usePoolStats } from '@/hooks/usePools'

export function PoolDiscovery() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<PoolStatus[]>([])
  const [sortBy, setSortBy] = useState<PoolFilters['sortBy']>('created')
  const [sortOrder, setSortOrder] = useState<PoolFilters['sortOrder']>('desc')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Build filters object
  const filters: PoolFilters = {
    search: searchQuery.trim() || undefined,
    status: selectedStatus.length > 0 ? selectedStatus : undefined,
    sortBy,
    sortOrder,
  }

  // Use real contract data
  const { pools, totalCount, filteredCount, isLoading, error, refetch } = useFilteredPools(filters)
  const { stats, isLoading: isStatsLoading } = usePoolStats()

  const handleRefresh = () => {
    refetch()
  }

  const handleStatusChange = (status: string) => {
    if (status === 'all') {
      setSelectedStatus([])
    } else {
      setSelectedStatus([status as PoolStatus])
    }
  }

  const handleSortChange = (sort: string) => {
    const [sortField, order] = sort.split('-')
    setSortBy(sortField as PoolFilters['sortBy'])
    setSortOrder(order as PoolFilters['sortOrder'] || 'desc')
  }

  // Quick stats from real contract data
  const quickStats = [
    {
      label: 'Total Pools',
      value: isStatsLoading ? '...' : stats?.totalPools.toString() || '0',
      icon: Rocket,
      color: 'text-blue-400'
    },
    {
      label: 'Active Pools',
      value: isStatsLoading ? '...' : stats?.activePools.toString() || '0',
      icon: Rocket,
      color: 'text-green-400'
    },
    {
      label: 'Launched Projects',
      value: isStatsLoading ? '...' : stats?.launchedProjects.toString() || '0',
      icon: Rocket,
      color: 'text-purple-400'
    },
    {
      label: 'Total Funding',
      value: isStatsLoading ? '...' : `${Number(stats?.totalFunding || 0n) / 1e6}K USDC`,
      icon: Rocket,
      color: 'text-cyan-400'
    }
  ]

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
                  onClick={handleRefresh}
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
                    {/* Mobile filters content will be added */}
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="text-sm text-muted-foreground">
                {filteredCount} pool{filteredCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Quick Stats - Full Width Above Everything */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="p-4 glass bg-card backdrop-blur-sm border-border/50">
              <div className="flex items-center space-x-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

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
                <CardContent className="space-y-6">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="search"
                        placeholder="Search pools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selectedStatus.length > 0 ? selectedStatus[0] : 'all'} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deploying">Deploying</SelectItem>
                        <SelectItem value="launched">Launched</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created-desc">Recently Created</SelectItem>
                        <SelectItem value="created-asc">Oldest First</SelectItem>
                        <SelectItem value="totalContributions-desc">Most Funded</SelectItem>
                        <SelectItem value="totalContributions-asc">Least Funded</SelectItem>
                        <SelectItem value="progress-desc">Highest Progress</SelectItem>
                        <SelectItem value="progress-asc">Lowest Progress</SelectItem>
                        <SelectItem value="timeRemaining-asc">Ending Soon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedStatus([])
                      setSortBy('created')
                      setSortOrder('desc')
                    }}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>
              
              {/* Pool Count */}
              <div className="mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredCount} of {totalCount} pool{filteredCount !== 1 ? 's' : ''}
                  {selectedStatus.length > 0 && (
                    <span className="text-accent font-medium"> ({selectedStatus[0]})</span>
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

            {/* Mobile Search and Filters */}
            <div className="lg:hidden mb-6">
              <div className="flex flex-col gap-4 mb-4">
                {/* Mobile Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search pools by token name or symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Mobile Filters Row */}
                <div className="flex gap-2">
                  <Select value={selectedStatus.length > 0 ? selectedStatus[0] : 'all'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deploying">Deploying</SelectItem>
                      <SelectItem value="launched">Launched</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created-desc">Recently Created</SelectItem>
                      <SelectItem value="created-asc">Oldest First</SelectItem>
                      <SelectItem value="totalContributions-desc">Most Funded</SelectItem>
                      <SelectItem value="totalContributions-asc">Least Funded</SelectItem>
                      <SelectItem value="progress-desc">Highest Progress</SelectItem>
                      <SelectItem value="progress-asc">Lowest Progress</SelectItem>
                      <SelectItem value="timeRemaining-asc">Ending Soon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Results Header with Sort Indicator */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                <span>Sorted by:</span>
                <span className="text-accent font-medium">
                  {sortBy === 'created' && sortOrder === 'desc' ? 'Recently Created' :
                   sortBy === 'created' && sortOrder === 'asc' ? 'Oldest First' :
                   sortBy === 'totalContributions' && sortOrder === 'desc' ? 'Most Funded' :
                   sortBy === 'totalContributions' && sortOrder === 'asc' ? 'Least Funded' :
                   sortBy === 'progress' && sortOrder === 'desc' ? 'Highest Progress' :
                   sortBy === 'progress' && sortOrder === 'asc' ? 'Lowest Progress' :
                   sortBy === 'timeRemaining' && sortOrder === 'asc' ? 'Ending Soon' :
                   'Recently Created'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <LoadingSpinner size="sm" text="Loading pools..." />
                ) : error ? (
                  'Error loading pools'
                ) : (
                  `Showing ${filteredCount} of ${totalCount} pools`
                )}
              </div>
            </div>

      {/* Error State */}
      {error && (
        <ErrorDisplay
          error={error}
          title="Failed to load pools"
          description="There was an error loading pools from the contract. Please try again."
          onRetry={handleRefresh}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-4">
              <CardLoadingSkeleton />
            </div>
          ))}
        </div>
      )}

      {/* Pools Grid */}
      {!isLoading && !error && pools && (
        <>
          {pools.length === 0 ? (
            <div className="text-center py-12">
              <Rocket className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No pools found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedStatus.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'No pools have been created yet'}
              </p>
              {(searchQuery || selectedStatus.length > 0) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedStatus([])
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {pools.map((pool) => (
                <div key={pool.address} className="mb-4">
                  <PoolCard pool={pool} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
