'use client'

import { useState } from 'react'
import { Search, Filter, Rocket, ArrowUpDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { PoolCard } from './pool-card'
import { PoolData, PoolFilters, PoolStatus } from '@/types'
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
  const { stats, isLoading: isStatsLoading, error: statsError } = usePoolStats()

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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Discover Pools
          </h1>
          <p className="text-muted-foreground">
            Find and contribute to crowdfunding pools for innovative projects
          </p>
        </div>
        
        <Button 
          onClick={handleRefresh}
          variant="outline" 
          size="sm"
          disabled={isLoading}
          className="self-start md:self-center"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, index) => (
          <Card key={index} className="p-4">
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

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search pools by token name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden md:flex gap-4">
          <Select value={selectedStatus[0] || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">Newest First</SelectItem>
              <SelectItem value="created-asc">Oldest First</SelectItem>
              <SelectItem value="timeRemaining-asc">Ending Soon</SelectItem>
              <SelectItem value="totalContributions-desc">Most Funded</SelectItem>
              <SelectItem value="totalContributions-asc">Least Funded</SelectItem>
              <SelectItem value="progress-desc">Highest Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Filter Button */}
        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="space-y-6 py-6">
              <div>
                <Label className="text-base font-medium">Status</Label>
                <Select value={selectedStatus[0] || 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-2">
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
              </div>

              <div>
                <Label className="text-base font-medium">Sort By</Label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created-desc">Newest First</SelectItem>
                    <SelectItem value="created-asc">Oldest First</SelectItem>
                    <SelectItem value="timeRemaining-asc">Ending Soon</SelectItem>
                    <SelectItem value="totalContributions-desc">Most Funded</SelectItem>
                    <SelectItem value="totalContributions-asc">Least Funded</SelectItem>
                    <SelectItem value="progress-desc">Highest Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <LoadingSpinner size="sm" text="Loading pools..." />
          ) : error ? (
            'Error loading pools'
          ) : (
            `Showing ${filteredCount} of ${totalCount} pools`
          )}
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardLoadingSkeleton key={i} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pools.map((pool) => (
                <PoolCard key={pool.address} pool={pool} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
