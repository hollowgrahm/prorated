'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Users,
  Trophy,
  Clock,
  Coins
} from 'lucide-react'
import { Pool } from '@/types/pool'

interface Contributor {
  address: string
  amount: number
  lockWeeks: number
  shares: number
  timestamp: number
  rank: number
}

interface ContributorListProps {
  pool: Pool
}

export function ContributorList({ pool }: ContributorListProps) {
  // Mock contributor data - in real app this would come from blockchain events
  const generateMockContributors = (): Contributor[] => {
    const contributors: Contributor[] = []
    const contributorCount = Math.min(pool.contributors, 20) // Show top 20 with full width
    
    // Generate realistic contributor distribution
    
    for (let i = 0; i < contributorCount; i++) {
      const isWhale = i < 3 // Top 3 are whales
      const isMedium = i < 8 // Next 5 are medium contributors
      
      // Distribute contributions realistically (power law distribution)
      let contributionPercent
      if (isWhale) {
        contributionPercent = 0.15 - (i * 0.03) // 15%, 12%, 9%
      } else if (isMedium) {
        contributionPercent = 0.08 - ((i - 3) * 0.01) // 8% down to 4%
      } else {
        contributionPercent = Math.random() * 0.03 + 0.005 // 0.5% to 3.5%
      }
      
      const amount = Math.floor(pool.totalContributions * contributionPercent)
      const lockWeeks = Math.floor(Math.random() * 156) + 4 // 4-160 weeks
      const shares = amount * lockWeeks
      
      contributors.push({
        address: `0x${Math.random().toString(16).substring(2, 10).padStart(8, '0')}...${Math.random().toString(16).substring(2, 6)}`,
        amount,
        lockWeeks,
        shares,
        timestamp: pool.startTime + Math.random() * (Math.min(Date.now() / 1000, pool.endTime) - pool.startTime),
        rank: i + 1
      })
      

    }
    
    // Sort by shares (highest first)
    return contributors.sort((a, b) => b.shares - a.shares).map((c, i) => ({ ...c, rank: i + 1 }))
  }

  const contributors = generateMockContributors()
  const totalDisplayedShares = contributors.reduce((sum, c) => sum + c.shares, 0)
  const totalDisplayedContributions = contributors.reduce((sum, c) => sum + c.amount, 0)

  const formatDuration = (weeks: number) => {
    if (weeks >= 52) {
      const years = Math.floor(weeks / 52)
      const remainingWeeks = weeks % 52
      return `${years}yr${years !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks}w` : ''}`
    }
    if (weeks >= 4) {
      const months = Math.floor(weeks / 4)
      const remainingWeeks = weeks % 4
      return `${months}mo${months !== 1 ? 's' : ''}${remainingWeeks > 0 ? ` ${remainingWeeks}w` : ''}`
    }
    return `${weeks} week${weeks !== 1 ? 's' : ''}`
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-400" />
    if (rank === 2) return <Trophy className="h-4 w-4 text-gray-300" />
    if (rank === 3) return <Trophy className="h-4 w-4 text-amber-600" />
    return <span className="text-xs text-muted-foreground font-mono w-4 text-center">#{rank}</span>
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'border-yellow-500/50 bg-yellow-500/10'
    if (rank === 2) return 'border-gray-400/50 bg-gray-400/10'
    if (rank === 3) return 'border-amber-600/50 bg-amber-600/10'
    return 'border-border/30 bg-secondary/20'
  }

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Top Contributors</span>
          </div>
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            {pool.contributors} total
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-secondary/30 rounded-lg border border-border/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {totalDisplayedContributions.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {pool.fundingTokenSymbol} from top {contributors.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {totalDisplayedShares.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Pool shares (top {contributors.length})
            </div>
          </div>
        </div>

        {/* Contributors list - responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contributors.map((contributor) => (
            <div 
              key={contributor.address} 
              className={`p-4 rounded-lg border transition-all duration-200 hover:scale-105 ${getRankColor(contributor.rank)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {getRankIcon(contributor.rank)}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${contributor.address}`} />
                    <AvatarFallback className="text-xs">
                      {contributor.address.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm truncate">{contributor.address}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(contributor.timestamp * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contribution amount */}
              <div className="mb-3">
                <div className="font-medium text-lg">
                  {contributor.amount.toLocaleString()} {pool.fundingTokenSymbol}
                </div>
                <div className="text-sm text-accent">
                  {contributor.shares.toLocaleString()} shares
                </div>
              </div>

              {/* Contribution details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Lock Duration</span>
                  </div>
                  <span className="font-medium">{formatDuration(contributor.lockWeeks)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Coins className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Pool Share</span>
                  </div>
                  <span className="font-medium">
                    {((contributor.shares / pool.totalShares) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Progress bar showing relative contribution */}
              <div className="mt-3">
                <Progress 
                  value={(contributor.amount / contributors[0].amount) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Show more indicator */}
        {pool.contributors > contributors.length && (
          <div className="mt-4 text-center">
            <div className="text-sm text-muted-foreground">
              + {pool.contributors - contributors.length} more contributors
            </div>
          </div>
        )}

        {/* Average contribution stats */}
        <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border/30">
          <h4 className="font-medium mb-3 text-accent">Pool Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Average Contribution:</span>
              <div className="font-medium">
                {Math.floor(pool.totalContributions / pool.contributors).toLocaleString()} {pool.fundingTokenSymbol}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Average Lock Duration:</span>
              <div className="font-medium">
                {pool.totalShares > 0 ? (pool.totalShares / pool.totalContributions).toFixed(1) : '0'} weeks
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
