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
    title: "Create Pool",
    description: "Launch a crowdfunding campaign for your token with customizable parameters.",
    icon: Rocket,
    details: [
      "Set token name, symbol, and total supply",
      "Define funding goals and duration", 
      "Configure tokenomics (dev fund, treasury, DAO)",
      "Deploy to the Prorated Factory"
    ]
  },
  {
    step: 2,
    title: "Community Funding",
    description: "Contributors fund your project with USDC and choose their commitment level.",
    icon: Users,
    details: [
      "Contributors deposit USDC to support your project",
      "Lock duration (1-208 weeks) determines voting power",
      "Transparent funding progress and milestones",
      "Minimum funding threshold protection"
    ]
  },
  {
    step: 3,
    title: "Successful Launch",
    description: "Once funding succeeds, deploy your complete DeFi ecosystem automatically.",
    icon: CheckCircle,
    details: [
      "Deploy ERC-20 token contract",
      "Create 80/20 weighted Proswap pair",
      "Seed initial liquidity from raised funds",
      "Launch veNFT and governance contracts"
    ]
  },
  {
    step: 4,
    title: "DeFi Integration",
    description: "Your token goes live with trading, lending, and governance from day one.",
    icon: TrendingUp,
    details: [
      "Trade on Proswap with automated liquidity",
      "Lend and borrow on Prolend markets",
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
    description: "Voting power based on LP lock duration creates aligned long-term governance."
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
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
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
                      
                      <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-center space-x-2 text-sm text-muted-foreground">
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
            <p className="text-muted-foreground">
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
                  <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
