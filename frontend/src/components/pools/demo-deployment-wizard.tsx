'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Rocket, 
  Coins, 
  ArrowRightLeft, 
  Droplets, 
  Vote, 
  Building2, 
  TrendingUp,
  Check,
  AlertCircle,
  ExternalLink,
  Info,
  Sparkles,
  Copy
} from 'lucide-react'
import { PoolData } from '@/types'
import { useAllDemoDeploymentActions } from '@/hooks/useDemoDeployment'

interface DemoDeploymentWizardProps {
  pool: PoolData
}

type DeploymentStep = {
  id: string
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  status: 'pending' | 'ready' | 'deploying' | 'completed' | 'failed'
  dependencies?: string[]
  estimatedGas?: string
  details?: string
  demoFeatures?: string[]
}

export function DemoDeploymentWizard({ pool }: DemoDeploymentWizardProps) {
  const [activeStep, setActiveStep] = useState<string>('token')
  const [showSuccess, setShowSuccess] = useState<string | null>(null)
  
  // Get demo deployment actions
  const deploymentActions = useAllDemoDeploymentActions(pool.address)
  
  // Define deployment steps with demo-specific information
  const steps: DeploymentStep[] = [
    {
      id: 'token',
      title: 'Deploy Token Contract',
      description: 'Create the ERC20 token with custom tokenomics',
      icon: Coins,
      status: 'ready',
      estimatedGas: '~0.15 ETH',
      details: `Deploy ${pool.config.tokenSymbol} token with ${Number(pool.config.tokenTotalSupply / BigInt(10**18)).toLocaleString()}M total supply`
    },
    {
      id: 'pair',
      title: 'Create Trading Pair',
      description: 'Deploy Proswap DEX trading pair',
      icon: ArrowRightLeft,
      status: 'pending',
      dependencies: ['token'],
      estimatedGas: '~0.12 ETH',
      details: `Create ${pool.config.tokenSymbol}/USDC trading pair on Proswap DEX`,
      demoFeatures: [
        'Automated market maker (AMM) pair',
        'Low slippage trading with concentrated liquidity',
        'Fee sharing with LP providers'
      ]
    },
    {
      id: 'liquidity',
      title: 'Seed Initial Liquidity',
      description: 'Add initial liquidity and calculate LP allocations',
      icon: Droplets,
      status: 'pending',
      dependencies: ['pair'],
      estimatedGas: '~0.18 ETH',
      details: `Add ${Number(pool.totalContributions / BigInt(10**6)).toLocaleString()}K USDC initial liquidity`,
      demoFeatures: [
        'Price discovery through initial liquidity ratio',
        'LP tokens distributed to contributors',
        'Liquidity lock for price stability'
      ]
    },
    {
      id: 'venft',
      title: 'Deploy veNFT System',
      description: 'Create vote-escrowed NFT contract for governance',
      icon: Vote,
      status: 'pending',
      dependencies: ['liquidity'],
      estimatedGas: '~0.14 ETH',
      details: 'Enable governance participation through LP token locking',
      demoFeatures: [
        'NFT-based voting power representation',
        'Time-weighted governance influence',
        'Tradeable governance positions'
      ]
    },
    {
      id: 'governor',
      title: 'Deploy DAO Governor',
      description: 'Create decentralized governance system',
      icon: Building2,
      status: 'pending',
      dependencies: ['venft'],
      estimatedGas: '~0.11 ETH',
      details: 'Decentralized decision making for protocol upgrades',
      demoFeatures: [
        'Proposal creation and voting system',
        'Timelock execution for security',
        'Quorum and threshold management'
      ]
    },
    {
      id: 'treasury',
      title: 'Deploy Treasury',
      description: 'Create multi-sig treasury for fund management',
      icon: TrendingUp,
      status: 'pending',
      dependencies: ['governor'],
      estimatedGas: '~0.09 ETH',
      details: 'Secure fund management with governance oversight',
      demoFeatures: [
        'Multi-signature security',
        'Governance-controlled spending',
        'Transparent fund allocation'
      ]
    },
    {
      id: 'prolend',
      title: 'Deploy Lending Pairs',
      description: 'Create 80/20 and 20/80 lending pools',
      icon: Sparkles,
      status: 'pending',
      dependencies: ['pair'],
      estimatedGas: '~0.16 ETH',
      details: 'Enable lending and borrowing with dual pool architecture',
      demoFeatures: [
        'Dual-pool lending system (80/20 & 20/80)',
        'Dynamic interest rates',
        'Collateralized lending with liquidation'
      ]
    },
  ]

  // Update step statuses based on deployment state
  const getStepStatus = (step: DeploymentStep): DeploymentStep['status'] => {
    const action = deploymentActions[step.id as keyof typeof deploymentActions]
    
    if (action.isLoading) return 'deploying'
    if (action.isSuccess) return 'completed'
    if (action.isError) return 'failed'
    
    // Check dependencies
    if (step.dependencies) {
      const allDepsCompleted = step.dependencies.every(depId => 
        deploymentActions[depId as keyof typeof deploymentActions]?.isSuccess
      )
      return allDepsCompleted ? 'ready' : 'pending'
    }
    
    return 'ready'
  }

  const updatedSteps = steps.map(step => ({
    ...step,
    status: getStepStatus(step)
  }))

  const handleDeploy = async (stepId: string) => {
    const action = deploymentActions[stepId as keyof typeof deploymentActions]
    if (action && !action.isLoading && !action.isSuccess) {
      // Reset if failed to allow retry
      if (action.isError) {
        action.reset()
      }
      
      action.execute()
      
      // Show success animation after deployment
      setTimeout(() => {
        if (action.isSuccess) {
          setShowSuccess(stepId)
          setTimeout(() => setShowSuccess(null), 3000)
        }
      }, 100)
    }
  }

  const getStepIcon = (step: DeploymentStep) => {
    const IconComponent = step.icon
    switch (step.status) {
      case 'completed':
        return <Check className="h-5 w-5 text-green-400" />
      case 'deploying':
        return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-400" />
      default:
        return <IconComponent className={`h-5 w-5 ${step.status === 'ready' ? 'text-primary' : 'text-muted-foreground'}`} />
    }
  }

  const getStepBadge = (step: DeploymentStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-500/30">Deployed</Badge>
      case 'deploying':
        return <Badge variant="default" className="bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse">Deploying...</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'ready':
        return <Badge variant="outline" className="border-primary/30 text-primary">Ready</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const completedSteps = updatedSteps.filter(step => step.status === 'completed').length
  const totalSteps = updatedSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // The deploymentActions hooks already manage their own state and persistence

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      <Alert className="border-green-500/50 bg-green-500/10">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo Mode:</strong> This deployment wizard simulates the real token launch process. 
          Click each step to see realistic deployment timing and contract addresses.
        </AlertDescription>
      </Alert>

      {/* Progress Overview */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Rocket className="h-5 w-5 text-primary" />
              <span>Ecosystem Deployment</span>
            </CardTitle>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {completedSteps}/{totalSteps} Complete
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Deployment Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pool Status</p>
                <p className="font-medium capitalize">{pool.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Funding</p>
                <p className="font-medium">{Number(pool.totalContributions / BigInt(10**6)).toLocaleString()}K USDC</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Steps */}
      <div className="space-y-4">
        {updatedSteps.map((step) => {
          const action = deploymentActions[step.id as keyof typeof deploymentActions]
          const isActive = activeStep === step.id
          
          return (
            <Card 
              key={step.id} 
              className={`border-border/50 bg-card/95 backdrop-blur-sm shadow-lg transition-all duration-200 ${
                isActive ? 'ring-2 ring-primary/50' : ''
              } ${showSuccess === step.id ? 'ring-2 ring-green-500/50 animate-pulse' : ''}`}
            >
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setActiveStep(isActive ? '' : step.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStepIcon(step)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{step.title}</h3>
                        {getStepBadge(step)}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {step.estimatedGas && (
                      <Badge variant="outline" className="text-xs">
                        {step.estimatedGas}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={step.status === 'ready' || step.status === 'failed' ? 'default' : 'outline'}
                      disabled={step.status === 'pending' || step.status === 'completed' || action.isLoading}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeploy(step.id)
                      }}
                    >
                      {action.isLoading ? 'Deploying...' : 
                       step.status === 'completed' ? 'Deployed' :
                       step.status === 'failed' ? 'Retry' :
                       step.status === 'ready' ? 'Deploy' : 'Waiting...'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isActive && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Deployment Details</h4>
                      <p className="text-sm text-muted-foreground">{step.details}</p>
                    </div>

                    {step.demoFeatures && (
                      <div>
                        <h4 className="font-medium mb-2">Key Features</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {step.demoFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Show deployment result */}
                    {action.isSuccess && action.address && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-green-400">✅ Deployment Successful</h4>
                          <Badge variant="outline" className="border-green-500/30 text-green-300">
                            Live
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Contract Address:</span>
                            <div className="flex items-center space-x-2">
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {action.address.slice(0, 6)}...{action.address.slice(-4)}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(action.address!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {action.txHash && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Transaction:</span>
                              <div className="flex items-center space-x-2">
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                  {action.txHash.slice(0, 6)}...{action.txHash.slice(-4)}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(action.txHash!)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show error */}
                    {action.isError && action.error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <h4 className="font-medium text-red-400 mb-2">❌ Deployment Failed</h4>
                        <p className="text-sm text-muted-foreground">{action.error.message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Completion Message */}
      {completedSteps === totalSteps && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-green-400 mb-2">
                🎉 Ecosystem Deployment Complete!
              </h3>
              <p className="text-muted-foreground mb-4">
                All contracts have been successfully deployed. The {pool.config.tokenSymbol} ecosystem is now live!
              </p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" className="border-green-500/30">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button className="bg-green-500/20 hover:bg-green-500/30 border-green-500/30">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Launch Celebration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
