import Link from 'next/link'
import { ArrowRight, Rocket, TrendingUp, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function HeroSection() {
  return (
    <section className="relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      
      {/* Content */}
      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="text-center space-y-8 max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-primary/20 bg-primary/5">
              <Rocket className="w-4 h-4 mr-2" />
              The Future of Token Launches
            </Badge>
          </div>

          {/* Main headline */}
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
              <span className="gradient-text">Crowdfund</span>{' '}
              <span className="text-foreground">Your Token</span>
              <br />
              <span className="text-foreground">Launch with</span>{' '}
              <span className="gradient-text">Community</span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The only platform you need to crowdfund your token, deploy to DEX, 
              enable lending, and launch governance - all in one seamless flow.
            </p>
          </div>

          {/* Key benefits */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Community-Driven Funding</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>Secure & Transparent</span>
            </div>
            <div className="flex items-center space-x-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span>End-to-End Integration</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button asChild size="lg" className="text-lg px-8 py-6 glow-purple">
              <Link href="/pools">
                Discover Projects
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link href="/pools/create">
                Launch Your Token
              </Link>
            </Button>
          </div>

          {/* Stats preview */}
          <div className="pt-16 border-t border-border/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold gradient-text">4</div>
                <div className="text-sm text-muted-foreground mt-1">Active Pools</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold gradient-text">$0</div>
                <div className="text-sm text-muted-foreground mt-1">Total Raised</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold gradient-text">100%</div>
                <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
