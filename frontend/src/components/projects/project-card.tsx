'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Users, DollarSign, Lock, ExternalLink, Globe, Twitter } from 'lucide-react'
import { Project, ProjectCardProps } from '@/types/project'

function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(decimals)}M`
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(decimals)}K`
  }
  return `$${num.toFixed(decimals)}`
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp
  const days = Math.floor(diff / (24 * 60 * 60))
  
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'defi':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'ai':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case 'gaming':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'social':
      return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    case 'infrastructure':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

export function ProjectCard({ project, onClick, className = '' }: ProjectCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(project)
    }
  }

  const CardWrapper = onClick ? 'div' : Link
  const cardProps = onClick 
    ? { onClick: handleClick }
    : { href: `/projects/${project.address}` }

  const priceChangeIsPositive = project.priceChange24h >= 0

  return (
    <CardWrapper {...cardProps}>
      <Card className={`group hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 border-border border-2 hover:border-primary/60 relative overflow-hidden bg-card backdrop-blur-sm shadow-lg ${className}`}>
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/12" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant="outline" className="text-xs font-medium bg-secondary/50">
                  {project.symbol}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatAddress(project.address)} • Launched {formatTimeAgo(project.launchDate)}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${getCategoryColor(project.category)}`}
              >
                {project.category.toUpperCase()}
              </Badge>
              <div className="flex items-center space-x-1">
                {project.website && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      window.open(project.website, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    <Globe className="h-3 w-3" />
                  </Button>
                )}
                {project.twitter && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      window.open(project.twitter, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    <Twitter className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <p className="text-sm text-foreground line-clamp-2">
            {project.description}
          </p>
          
          {/* Price and Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Token Price</p>
              <p className="font-bold text-lg">${project.tokenPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">24h Change</p>
              <div className="flex items-center space-x-1">
                {priceChangeIsPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span className={`font-medium ${priceChangeIsPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChangeIsPositive ? '+' : ''}{project.priceChange24h.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Market Cap</p>
              <p className="font-medium">{formatNumber(project.marketCap)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">TVL</p>
              <p className="font-medium">{formatNumber(project.totalValueLocked)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">24h Volume</p>
              <p className="font-medium">{formatNumber(project.volume24h)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Holders</p>
              <p className="font-medium">{project.holders.toLocaleString()}</p>
            </div>
          </div>

          {/* Available Features */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3" />
                <span>Trade</span>
              </div>
              <div className="flex items-center space-x-1">
                <Lock className="h-3 w-3" />
                <span>Lend</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>Govern</span>
              </div>
            </div>
            <Button size="sm" className="btn-primary-custom" asChild>
              <Link href={`/projects/${project.address}`} onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="h-4 w-4 mr-1" />
                View Project
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  )
}
