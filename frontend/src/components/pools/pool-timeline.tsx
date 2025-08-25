'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Clock,
  Target,
  Rocket,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react'
import { Pool } from '@/types/pool'

interface TimelineEvent {
  id: string
  title: string
  description: string
  timestamp: number
  type: 'created' | 'started' | 'milestone' | 'ended' | 'deployed' | 'launched'
  icon: React.ComponentType<{ className?: string }>
  status: 'completed' | 'current' | 'upcoming'
  data?: Record<string, unknown>
}

interface PoolTimelineProps {
  pool: Pool
}

export function PoolTimeline({ pool }: PoolTimelineProps) {
  const now = Date.now() / 1000

  // Generate timeline events based on pool data
  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = []

    // Pool creation (estimated as 1 day before start)
    events.push({
      id: 'created',
      title: 'Pool Created',
      description: `${pool.tokenName} funding pool created by developer`,
      timestamp: pool.startTime - 86400, // 1 day before start
      type: 'created',
      icon: Rocket,
      status: 'completed'
    })

    // Funding start
    events.push({
      id: 'started',
      title: 'Funding Started',
      description: 'Pool opened for contributions',
      timestamp: pool.startTime,
      type: 'started',
      icon: Target,
      status: now >= pool.startTime ? 'completed' : 'upcoming'
    })

    // Milestones during funding (25%, 50%, 75% if reached)
    const fundingProgress = (pool.totalContributions / pool.minTotalContributions) * 100
    
    if (fundingProgress >= 25) {
      events.push({
        id: 'milestone-25',
        title: '25% Funding Reached',
        description: `Raised ${(pool.minTotalContributions * 0.25).toLocaleString()} ${pool.fundingTokenSymbol}`,
        timestamp: pool.startTime + (pool.endTime - pool.startTime) * 0.3, // Estimate timing
        type: 'milestone',
        icon: TrendingUp,
        status: 'completed',
        data: { percentage: 25 }
      })
    }

    if (fundingProgress >= 50) {
      events.push({
        id: 'milestone-50',
        title: '50% Funding Reached',
        description: `Raised ${(pool.minTotalContributions * 0.5).toLocaleString()} ${pool.fundingTokenSymbol}`,
        timestamp: pool.startTime + (pool.endTime - pool.startTime) * 0.6,
        type: 'milestone',
        icon: TrendingUp,
        status: 'completed',
        data: { percentage: 50 }
      })
    }

    if (fundingProgress >= 75) {
      events.push({
        id: 'milestone-75',
        title: '75% Funding Reached',
        description: `Raised ${(pool.minTotalContributions * 0.75).toLocaleString()} ${pool.fundingTokenSymbol}`,
        timestamp: pool.startTime + (pool.endTime - pool.startTime) * 0.8,
        type: 'milestone',
        icon: TrendingUp,
        status: 'completed',
        data: { percentage: 75 }
      })
    }

    // Funding end
    const fundingEnded = now >= pool.endTime
    const fundingSuccessful = pool.totalContributions >= pool.minTotalContributions

    events.push({
      id: 'ended',
      title: fundingSuccessful ? 'Funding Successful' : (fundingEnded ? 'Funding Failed' : 'Funding Ends'),
      description: fundingSuccessful 
        ? `Successfully raised ${pool.totalContributions.toLocaleString()} ${pool.fundingTokenSymbol}` 
        : (fundingEnded 
          ? `Failed to reach minimum of ${pool.minTotalContributions.toLocaleString()} ${pool.fundingTokenSymbol}` 
          : `Target: ${pool.minTotalContributions.toLocaleString()} ${pool.fundingTokenSymbol}`),
      timestamp: pool.endTime,
      type: 'ended',
      icon: fundingSuccessful ? CheckCircle : AlertCircle,
      status: fundingEnded ? 'completed' : (now >= pool.endTime - 86400 ? 'current' : 'upcoming')
    })

    // Deployment events (if pool is successful)
    if (pool.status === 'deploying' || pool.status === 'launched') {
      // Token deployment
      events.push({
        id: 'token-deployed',
        title: 'Token Deployed',
        description: `${pool.tokenSymbol} token contract deployed`,
        timestamp: pool.endTime + 3600, // 1 hour after funding end
        type: 'deployed',
        icon: Rocket,
        status: pool.tokenAddress ? 'completed' : (pool.status === 'deploying' ? 'current' : 'upcoming')
      })

      // Trading pair
      if (pool.pairAddress || pool.status === 'launched') {
        events.push({
          id: 'pair-deployed',
          title: 'Trading Pair Created',
          description: `${pool.tokenSymbol}/${pool.fundingTokenSymbol} trading pair created`,
          timestamp: pool.endTime + 7200, // 2 hours after funding end
          type: 'deployed',
          icon: TrendingUp,
          status: pool.pairAddress ? 'completed' : 'upcoming'
        })
      }

      // Full launch
      if (pool.status === 'launched') {
        events.push({
          id: 'launched',
          title: 'Project Launched',
          description: 'All contracts deployed, project fully operational',
          timestamp: pool.endTime + 14400, // 4 hours after funding end
          type: 'launched',
          icon: CheckCircle,
          status: 'completed'
        })
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp)
  }

  const timelineEvents = generateTimelineEvents()

  const getEventStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'current':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'upcoming':
        return 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
    }
  }

  const getEventIcon = (event: TimelineEvent) => {
    const IconComponent = event.icon
    const iconClass = event.status === 'completed' ? 'text-green-400' : 
                     event.status === 'current' ? 'text-blue-400' : 
                     'text-muted-foreground'
    return <IconComponent className={`h-4 w-4 ${iconClass}`} />
  }

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>Pool Timeline</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  event.status === 'completed' ? 'bg-green-500/20 border-green-500/50' :
                  event.status === 'current' ? 'bg-blue-500/20 border-blue-500/50' :
                  'bg-muted/20 border-muted/50'
                }`}>
                  {getEventIcon(event)}
                </div>
                {index < timelineEvents.length - 1 && (
                  <div className={`w-0.5 h-8 mt-2 ${
                    event.status === 'completed' ? 'bg-green-500/30' : 'bg-border/30'
                  }`} />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">{event.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={`text-xs ${getEventStatusColor(event.status)}`}>
                      {event.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                
                {/* Additional data for milestones */}
                {event.type === 'milestone' && event.data && typeof event.data === 'object' && 'percentage' in event.data && (
                  <div className="mt-2 text-xs text-primary">
                    🎯 {(event.data as { percentage: number }).percentage}% milestone achieved
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Current status summary */}
        <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border/30">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Current Status</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {pool.status === 'active' && `Funding active • ${pool.contributors} contributors • ${((pool.totalContributions / pool.minTotalContributions) * 100).toFixed(1)}% of goal`}
            {pool.status === 'upcoming' && 'Funding has not started yet'}
            {pool.status === 'deploying' && 'Funding successful • Deployment in progress'}
            {pool.status === 'launched' && 'Project fully launched and operational'}
            {pool.status === 'failed' && 'Funding failed to reach minimum target'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
