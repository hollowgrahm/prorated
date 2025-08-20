'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users } from 'lucide-react'
import { Pool, PoolCardProps } from '@/types/pool'

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

function getStatusColor(status: Pool['status']): string {
  switch (status) {
    case 'upcoming':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'active':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'failed':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'success-pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'deploying':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'launched':
      return 'bg-primary/20 text-primary border-primary/30'
    default:
      return 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
  }
}

export function PoolCard({ pool, onClick, className = '' }: PoolCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(pool)
    }
  }

  const progressPercentage = Math.min(
    (pool.totalContributions / pool.minTotalContributions) * 100,
    100
  )

  const CardWrapper = onClick ? 'div' : Link
  const cardProps = onClick 
    ? { onClick: handleClick }
    : { href: `/pools/${pool.address}` }

  return (
    <CardWrapper {...cardProps}>
      <Card className={`group hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 border-border border-2 hover:border-primary/60 relative overflow-hidden bg-card backdrop-blur-sm shadow-lg ${className}`}>
        {/* Static gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/12" />
        {/* Animated background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{pool.tokenName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatAddress(pool.address)}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant="outline" className="text-xs font-medium bg-secondary/50">
                {pool.tokenSymbol}
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
            {pool.description}
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
                  width: `${progressPercentage}%` 
                }}
              />
            </div>
          </div>
          
          {/* Funding Details */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ${pool.totalContributions.toLocaleString()} raised
            </span>
            <span className="text-muted-foreground">
              ${pool.minTotalContributions.toLocaleString()} goal
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{pool.contributors} contributor{pool.contributors !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTimeRemaining(pool.endTime)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  )
}
