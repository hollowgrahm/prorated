'use client'

import { TrendingUp, Users, DollarSign, Target, Rocket, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { usePoolStats } from '@/hooks'
import { formatTokenAmount } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-boundary'

const statCards = [
  {
    icon: Rocket,
    label: "Active Pools",
    key: "activePools" as const,
    color: "text-primary"
  },
  {
    icon: CheckCircle,
    label: "Launched Projects", 
    key: "launchedProjects" as const,
    color: "text-green-500"
  },
  {
    icon: Target,
    label: "Total Pools",
    key: "totalPools" as const,
    color: "text-accent"
  },
  {
    icon: DollarSign,
    label: "Total Raised",
    key: "totalFunding" as const,
    color: "text-yellow-500",
    format: "currency"
  },
  {
    icon: Users,
    label: "Upcoming Pools",
    key: "upcomingPools" as const,
    color: "text-blue-500"
  },
  {
    icon: TrendingUp,
    label: "Success Rate",
    key: "successRate" as const,
    color: "text-purple-500",
    format: "percentage"
  }
]

export function ProtocolStats() {
  const { stats, isLoading, error } = usePoolStats()

  const getStatValue = (key: typeof statCards[number]['key']) => {
    if (!stats) return undefined
    
    if (key === 'successRate') {
      return stats.totalPools === 0 ? 0 : (stats.launchedProjects / stats.totalPools) * 100
    }
    
    return stats[key]
  }

  const formatValue = (key: typeof statCards[number]['key'], format?: string) => {
    if (isLoading || !stats) return "..."
    
    const value = getStatValue(key)
    
    switch (format) {
      case "currency":
        if (typeof value === 'bigint') {
          // Assuming USDC (6 decimals)
          return `$${formatTokenAmount(value, 6, 0)}`
        }
        return "$0"
      
      case "percentage":
        if (typeof value === 'number') {
          return `${value.toFixed(0)}%`
        }
        return "N/A"
      
      default:
        return value?.toString() || "0"
    }
  }

  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Protocol <span className="gradient-text">Metrics</span>
          </h2>
          <p className="text-xl text-foreground max-w-2xl mx-auto">
            Real-time statistics from the Prorated Protocol ecosystem
          </p>
        </div>

        {/* Error State */}
        {error && !isLoading && (
          <div className="max-w-2xl mx-auto mb-8">
            <ErrorDisplay
              error={error}
              title="Failed to load protocol statistics"
              description="We couldn't fetch the latest protocol metrics from the blockchain."
              variant="warning"
              className="border-yellow-500/50 bg-yellow-500/10"
            />
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.key} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                        <span className="text-sm font-medium text-foreground">
                          {stat.label}
                        </span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-bold">
                        {formatValue(stat.key, stat.format)}
                      </div>
                    </div>
                    
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional insights */}
        {stats && !isLoading && (
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center glass p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-2 text-accent">Deployment Progress</h3>
                <div className="space-y-2">
                  {stats.deployingPools > 0 && (
                    <div className="text-sm text-foreground">
                      {stats.deployingPools} project{stats.deployingPools !== 1 ? 's' : ''} currently deploying
                    </div>
                  )}
                  {stats.deployingPools === 0 && (
                    <div className="text-sm text-foreground">
                      All successful pools have been deployed
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center glass p-6 rounded-xl">
                <h3 className="text-lg font-semibold mb-2 text-accent">Community Activity</h3>
                <div className="space-y-2">
                  <div className="text-sm text-foreground">
                    {stats.totalUsers} unique participants
                  </div>
                  <div className="text-sm text-foreground">
                    {stats.activePools + stats.upcomingPools} pools accepting contributions
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
