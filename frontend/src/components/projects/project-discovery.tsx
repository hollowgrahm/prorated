'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, TrendingUp, Zap, ArrowUpDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ProjectCard } from './project-card'
import { Project, ProjectFilters } from '@/types/project'
import { LoadingSpinner, CardLoadingSkeleton } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { useLaunchedProjects } from '@/hooks/useLaunchedProjects'

// Real launched projects from blockchain data

export function ProjectDiscovery() {
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    category: 'all',
    sortBy: 'newest'
  })



  // Use real launched projects from blockchain
  const { projects, isLoading, error } = useLaunchedProjects()

  // Apply filters and sorting
  const filteredProjects = (projects || [])
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

  // Memoize category counts for quick stats to prevent infinite re-renders
  const categoryStats = useMemo(() => ({
    all: projects.length,
    defi: projects.filter(p => p.category === 'defi').length,
    ai: projects.filter(p => p.category === 'ai').length,
    gaming: projects.filter(p => p.category === 'gaming').length,
    social: projects.filter(p => p.category === 'social').length,
    infrastructure: projects.filter(p => p.category === 'infrastructure').length
  }), [projects])

  const { totalMarketCap, totalTVL, totalVolume24h } = useMemo(() => ({
    totalMarketCap: projects.reduce((sum, p) => sum + p.marketCap, 0),
    totalTVL: projects.reduce((sum, p) => sum + p.totalValueLocked, 0),
    totalVolume24h: projects.reduce((sum, p) => sum + p.volume24h, 0)
  }), [projects])

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
              <p className="text-2xl font-bold text-accent">{projects.length}</p>
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {!isLoading && !error && (
                      <>
                        Showing {filteredProjects.length} of {(projects || []).length} projects
                        {filters.category !== 'all' && ` in ${filters.category}`}
                        {filters.search && ` matching "${filters.search}"`}
                      </>
                    )}
                    {isLoading && "Loading projects..."}
                    {error && "Error loading projects"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    disabled={isLoading}
                    className="hidden md:flex"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-6">
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" text="Loading launched projects..." />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
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
                  title="Failed to load projects"
                  description="We couldn't fetch the latest launched projects from the blockchain. Please try again."
                  onRetry={() => window.location.reload()}
                  variant="destructive"
                />
              </div>
            )}

            {/* Projects Grid */}
            {!isLoading && !error && filteredProjects.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredProjects.map((project: Project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredProjects.length === 0 && projects && projects.length > 0 && (
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

            {/* No Projects State */}
            {!isLoading && !error && projects && projects.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects launched yet</h3>
                <p className="text-muted-foreground">
                  Be the first to launch a project through our crowdfunding platform!
                </p>
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
              onChange={(e) => setFilters({...filters, search: e.target.value })}
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
              onClick={() => setFilters({...filters, category: category as ProjectFilters['category'] })}
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
          <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value as ProjectFilters['sortBy'] })}>
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
