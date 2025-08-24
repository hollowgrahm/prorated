'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users } from 'lucide-react'
import { PoolData, PoolCardProps } from '@/types'

function formatTimeRemaining(endTime: number): string {
  const now = Date.now() / 1000
  const timeLeft = endTime - now
  
  if (timeLeft <= 0) return 'Ended'
  
  const days = Math.floor(timeLeft / (24 * 60 * 60))
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60))
  
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`
  return `${hours} hour${hours !== 1 ? 's' : ''} left`
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getStatusColor(status: PoolData['status']): string {
  switch (status) {
    case 'upcoming':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'deploying':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'launched':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

function formatAmount(amount: bigint, decimals: number = 6): string {
  const value = Number(amount) / Math.pow(10, decimals)
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

export function PoolCard({ pool, compact = false }: PoolCardProps) {
  const progressPercentage = pool.progressPercentage
  const timeRemaining = formatTimeRemaining(pool.config.endTime)
  const totalContributions = formatAmount(pool.totalContributions)
  const minContributions = formatAmount(pool.minTotalContributions)

  // Generate a simple description based on pool data
  const description = `A decentralized ${pool.config.tokenName} project raising funds through community contributions. Join the movement and help shape the future of decentralized finance.`

  // Mock contributors count (since we don't have this data from contracts yet)
  const contributors = Math.floor(Math.random() * 50) + 5

  return (
    <Link href={`/pools/${pool.address}`}>
      <Card className="group hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 border-border border-2 hover:border-primary/60 relative overflow-hidden bg-card backdrop-blur-sm shadow-lg h-full">
        {/* Static gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/12" />
        {/* Animated background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold">
                {pool.config.tokenName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatAddress(pool.address)}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant="outline" className="text-xs font-medium bg-secondary/50">
                {pool.config.tokenSymbol}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${getStatusColor(pool.status)}`}
              >
                {pool.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <p className="text-sm text-foreground line-clamp-2">
            {description}
          </p>
          
          {/* Funding Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Funding Progress</span>
              <span className="font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden border border-border/60 shadow-inner">
              <div 
                className={`h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ${
                  pool.status === 'active' ? 'animate-pulse-slow shadow-sm shadow-primary/50' : ''
                }`}
                style={{ 
                  width: `${Math.min(progressPercentage, 100)}%` 
                }}
              />
            </div>
          </div>
          
          {/* Funding Details */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {totalContributions} USDC raised
            </span>
            <span className="text-muted-foreground">
              {minContributions} USDC goal
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{contributors} contributor{contributors !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{timeRemaining}</span>
            </div>
          </div>

          {/* Allocation Info - Single Segmented Bar */}
          {!compact && (
            <div className="pt-4 border-t border-border/30">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Token Allocation</p>
                
                {/* Single Segmented Bar */}
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    {/* Developer Segment */}
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                      style={{ width: `${pool.config.developerPercent || 40}%` }}
                    />
                    {/* Treasury Segment */}
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                      style={{ width: `${pool.config.treasuryPercent}%` }}
                    />
                    {/* DAO Segment */}
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                      style={{ width: `${pool.config.daoPercent}%` }}
                    />
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-400"></div>
                    <span className="text-muted-foreground">Dev {pool.config.developerPercent || 40}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-400"></div>
                    <span className="text-muted-foreground">Treasury {pool.config.treasuryPercent}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-green-400"></div>
                    <span className="text-muted-foreground">DAO {pool.config.daoPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Status-specific info */}
          {pool.status === 'launched' && pool.proratedToken !== '0x0000000000000000000000000000000000000000' && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-green-400">
                ✓ Token deployed • Trading live
              </p>
            </div>
          )}

          {pool.status === 'failed' && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-red-400">
                ⚠ Funding failed • Refunds available
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
