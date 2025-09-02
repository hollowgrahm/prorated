import { 
  Rocket, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Coins, 
  TrendingUp, 
  Vote, 
  Shield 
} from 'lucide-react'

const steps = [
  {
    step: 1,
    title: "Create Contribution Pool",
    description: "Launch a crowdfunding campaign for your DAO with customizable parameters.",
    icon: Rocket,
    details: [
      "Set token name, symbol, and total supply",
      "Define funding goals and duration", 
      "Configure developer, treasury and DAO allocations",
      "Deploy your Prorated Contribution Pool",
      "Share and grow your community!"
    ]
  },
  {
    step: 2,
    title: "Community Funding",
    description: "Contributors fund your project's DAO and choose their commitment level.",
    icon: Users,
    details: [
      "Contributors deposit assets to support your project",
      "Voter Escrow lock duration (1-208 weeks) is a multiplier on allocation of LP tokens",
      "Transparent funding progress and milestones",
      "Minimum funding threshold protection, oversubscription creates even deeper liquidity"
    ]
  },
  {
    step: 3,
    title: "Successful Launch",
    description: "Once funding succeeds, deploy your complete DAO ecosystem automatically.",
    icon: CheckCircle,
    details: [
      "Deploy ERC-20 token contract",
      "Create 80/20 weighted Proswap pair",
      "Developer team receives funding to build protocol",
      "Seed initial liquidity from remaining raised funds",
      "DEX pool LP tokens are locked into veNFTs and distributed back to contributors"
    ]
  },
  {
    step: 4,
    title: "DeFi Integration",
    description: "Your token goes live with trading, lending, and governance from day one.",
    icon: TrendingUp,
    details: [
      "Trade on Proswap with automated liquidity",
      "Borrow on Prolend markets to long and short with leverage",
      "Lend on Prolend markets to earn yield",
      "Participate in DAO governance with veNFTs",
      "Treasury management and protocol fees"
    ]
  }
]

const features = [
  {
    icon: Coins,
    title: "Proswap DEX",
    description: "Automated 80/20 weighted pools for optimal price discovery and liquidity efficiency."
  },
  {
    icon: Shield,
    title: "Prolend Markets", 
    description: "Instant lending markets for your token with dynamic interest rates."
  },
  {
    icon: Vote,
    title: "veNFT Governance",
    description: "Voting power based on LP lock duration creates aligned long term governance."
  }
]

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            How <span className="gradient-text">Prorated</span> Works
          </h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            From crowdfunding to full DeFi deployment in four simple steps. 
            No coding required, no complex integrations.
          </p>
        </div>

        {/* Process steps */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.step} className="relative">
                  {/* Step number */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-primary">
                          Step {step.step}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-primary/50" />
                      </div>
                      
                      <h3 className="text-2xl font-bold mb-3 text-accent">{step.title}</h3>
                      <p className="text-foreground mb-4">{step.description}</p>
                      
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-center space-x-2 text-sm text-foreground">
                            <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Connector line (only for desktop) */}
                  {index % 2 === 0 && index < steps.length - 2 && (
                    <div className="hidden lg:block absolute top-16 left-6 w-px h-20 bg-gradient-to-b from-primary/50 to-transparent" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Integrated features */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">
              Integrated <span className="gradient-text">DeFi Stack</span>
            </h3>
            <p className="text-foreground">
              Every launched token gets a complete DeFi ecosystem out of the box
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center glass p-6 rounded-xl">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2 text-accent">{feature.title}</h4>
                  <p className="text-sm text-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
