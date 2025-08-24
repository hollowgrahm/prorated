'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users, TrendingUp } from 'lucide-react'
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

export function PoolCard({ pool, showActions = true, compact = false }: PoolCardProps) {
  const progressPercentage = pool.progressPercentage
  const timeRemaining = formatTimeRemaining(pool.config.endTime)
  const totalContributions = formatAmount(pool.totalContributions)
  const minContributions = formatAmount(pool.minTotalContributions)

  return (
    <Link href={`/pools/${pool.address}`}>
      <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20 cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors truncate">
                {pool.config.tokenName}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                ${pool.config.tokenSymbol} • {formatAddress(pool.address)}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={`ml-2 capitalize ${getStatusColor(pool.status)}`}
            >
              {pool.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{totalContributions} USDC raised</span>
              <span>{minContributions} USDC goal</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Time Left</p>
                <p className="text-sm font-medium">{timeRemaining}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Supply</p>
                <p className="text-sm font-medium">
                  {formatAmount(pool.config.tokenTotalSupply, 18)} {pool.config.tokenSymbol}
                </p>
              </div>
            </div>
          </div>

          {/* Allocation Info */}
          {!compact && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Dev: {pool.config.developerPercent || 40}%</span>
                <span>Treasury: {pool.config.treasuryPercent}%</span>
                <span>DAO: {pool.config.daoPercent}%</span>
              </div>
            </div>
          )}

          {/* Status-specific info */}
          {pool.status === 'launched' && pool.proratedToken !== '0x0000000000000000000000000000000000000000' && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-green-400">
                ✓ Token deployed • Trading live
              </p>
            </div>
          )}

          {pool.status === 'failed' && (
            <div className="pt-2 border-t border-border/50">
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
