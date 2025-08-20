import Link from 'next/link'
import { 
  Rocket, 
  TrendingUp, 
  Vote, 
  Shield, 
  Zap, 
  Globe, 
  Users,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const mainFeatures = [
  {
    icon: Rocket,
    title: "Community Crowdfunding",
    description: "Launch your DAO through transparent community funding",
    benefits: [
      "Set custom funding goals and duration",
      "Community chooses commitment levels (1-208 weeks) for leverage on the size of their contribution",
      "Transparent progress tracking",
      "Minimum threshold protection"
    ],
    accent: "from-primary to-primary/70"
  },
  {
    icon: TrendingUp,
    title: "Instant DEX Trading",
    description: "Automatic Proswap deployment with optimized liquidity pools",
    benefits: [
      "80/20 weighted pools for deep liquidity, maximum upside exposure and downside protection",
      "Automated liquidity seeding",
      "Leveraged exposure enabled through Prolend markets",
      "Professional trading interface"
    ],
    accent: "from-accent to-accent/70"
  },
  {
    icon: Vote,
    title: "Governance & veNFTs",
    description: "DAO governance powered by lock-duration based voting",
    benefits: [
      "Transferable veNFTs create liquidity opportunities for contributors",
      "veNFT voting power scales with commitment",
      "Proposal creation and voting",
      "Treasury management",
      "Protocol parameter control"
    ],
    accent: "from-primary/80 to-accent/80"
  }
]

const additionalFeatures = [
  {
    icon: Shield,
    title: "Security First",
    description: "Audited contracts and battle-tested protocols"
  },
  {
    icon: Zap,
    title: "Gas Optimized",
    description: "Efficient contract design for lower transaction costs"
  },
  {
    icon: Globe,
    title: "Decentralized",
    description: "No central authority, community governed protocol"
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Built by and for the DeFi community"
  }
]

export function FeaturesShowcase() {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Why Choose <span className="gradient-text">Prorated</span>?
          </h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            The most comprehensive platform for fair token launches, combining decentralized crowdfunding, instant DAO creation, 
            DEX deployment, lending markets, and governance infrastructure in one seamless experience.
          </p>
        </div>

        {/* Main features grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 max-w-7xl mx-auto">
          {mainFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-5 group-hover:opacity-10 transition-opacity`} />
                
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl text-accent">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional features */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2 text-accent">{feature.title}</h3>
                  <p className="text-sm text-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA section */}
        <div className="text-center">
          <div className="max-w-2xl mx-auto glass p-8 rounded-2xl">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-accent">
              Ready to Launch Your Token?
            </h3>
            <p className="text-foreground mb-6">
              Join the future of decentralized token launches. Create your crowdfunding 
              campaign and deploy your complete DeFi ecosystem today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="btn-primary-custom">
                <Link href="/pools/create">
                  Start Your Campaign
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="btn-outline-custom">
                <Link href="/pools">
                  Browse Projects
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
