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
  Clock,
  AlertCircle,
  Wallet
} from 'lucide-react'
import { Pool } from '@/types/pool'

interface DeploymentWizardProps {
  pool: Pool
}

type DeploymentStep = {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'pending' | 'ready' | 'deploying' | 'completed' | 'failed'
  dependencies?: string[]
  estimatedGas?: string
  details?: string
}

export function DeploymentWizard({ pool }: DeploymentWizardProps) {
  const [activeStep, setActiveStep] = useState<string>('token')
  const [isWalletConnected, setIsWalletConnected] = useState(false) // Mock wallet state
  
  // Mock deployment state - will be replaced with real contract state
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([
    {
      id: 'token',
      title: 'Deploy Token',
      description: 'Create the ERC20 token contract',
      icon: Coins,
      status: 'ready',
      estimatedGas: '~0.15 ETH',
      details: `Deploy ${pool.tokenSymbol} token with ${pool.tokenTotalSupply.toLocaleString()} total supply`
    },
    {
      id: 'pair',
      title: 'Deploy Trading Pair',
      description: 'Create Proswap trading pair',
      icon: ArrowRightLeft,
      status: 'pending',
      dependencies: ['token'],
      estimatedGas: '~0.12 ETH',
      details: `Create ${pool.tokenSymbol}/${pool.fundingTokenSymbol} trading pair on Proswap DEX`
    },
    {
      id: 'liquidity',
      title: 'Deploy Liquidity',
      description: 'Seed initial liquidity and calculate LP allocations',
      icon: Droplets,
      status: 'pending',
      dependencies: ['pair'],
      estimatedGas: '~0.18 ETH',
      details: `Add initial liquidity using ${pool.liquidityFund.toLocaleString()} ${pool.fundingTokenSymbol}`
    },
    {
      id: 'venft',
      title: 'Deploy veNFT',
      description: 'Create vote-escrowed NFT contract for governance',
      icon: Vote,
      status: 'pending',
      dependencies: ['liquidity'],
      estimatedGas: '~0.14 ETH',
      details: 'Enable governance participation through LP token locking'
    },
    {
      id: 'governor',
      title: 'Deploy Governor',
      description: 'Create DAO governance contract',
      icon: Building2,
      status: 'pending',
      dependencies: ['venft'],
      estimatedGas: '~0.16 ETH',
      details: 'Establish decentralized governance system for the DAO'
    },
    {
      id: 'treasury',
      title: 'Deploy Treasury',
      description: 'Create treasury contract for DAO funds',
      icon: TrendingUp,
      status: 'pending',
      dependencies: ['governor'],
      estimatedGas: '~0.11 ETH',
      details: 'Set up treasury management under DAO control'
    },
    {
      id: 'prolend',
      title: 'Deploy Prolend',
      description: 'Create lending markets for token utility',
      icon: Droplets,
      status: 'pending',
      dependencies: ['pair'],
      estimatedGas: '~0.13 ETH',
      details: 'Enable lending and borrowing markets to increase token utility and liquidity'
    }
  ])

  const handleDeploy = async (stepId: string) => {
    if (!isWalletConnected) {
      setIsWalletConnected(true)
      return
    }

    // Update step to deploying
    setDeploymentSteps(steps => 
      steps.map(step => 
        step.id === stepId 
          ? { ...step, status: 'deploying' as const }
          : step
      )
    )

    // Simulate deployment
    setTimeout(() => {
      setDeploymentSteps(steps => 
        steps.map(step => {
          if (step.id === stepId) {
            return { ...step, status: 'completed' as const }
          }
          // Enable next steps that depend on this step
          if (step.dependencies?.includes(stepId)) {
            return { ...step, status: 'ready' as const }
          }
          return step
        })
      )
      
      // Move to next ready step
      const nextStep = deploymentSteps.find(step => 
        step.dependencies?.includes(stepId) && step.status === 'pending'
      )
      if (nextStep) {
        setActiveStep(nextStep.id)
      }
    }, 3000)
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

  const getStepStatus = (step: DeploymentStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">Completed</Badge>
      case 'deploying':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">Deploying</Badge>
      case 'ready':
        return <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">Ready</Badge>
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">Failed</Badge>
      default:
        return <Badge variant="outline" className="bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30">Pending</Badge>
    }
  }

  const completedSteps = deploymentSteps.filter(step => step.status === 'completed').length
  const totalSteps = deploymentSteps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  const currentStep = deploymentSteps.find(step => step.id === activeStep)

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Rocket className="h-5 w-5 text-primary" />
            <span>Deployment Wizard</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedSteps} of {totalSteps} completed</span>
          </div>
          
          <Progress value={progressPercentage} className="h-2" />
          
          <Alert className="border-blue-500/20 bg-blue-500/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Deploy your project step by step. Each deployment depends on the previous ones. 
              You can deploy steps individually or all at once.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Step Details */}
      {currentStep && (
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-3">
                {getStepIcon(currentStep)}
                <span>{currentStep.title}</span>
              </CardTitle>
              {getStepStatus(currentStep)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-foreground">{currentStep.details}</p>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Gas Cost:</span>
              <span className="font-medium">{currentStep.estimatedGas}</span>
            </div>
            
            {currentStep.status === 'ready' && (
              <Button
                onClick={() => handleDeploy(currentStep.id)}
                className="w-full btn-primary-custom"
                size="lg"
              >
                {!isWalletConnected ? (
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span>Connect Wallet</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Rocket className="h-4 w-4" />
                    <span>Deploy {currentStep.title}</span>
                  </div>
                )}
              </Button>
            )}
            
            {currentStep.status === 'deploying' && (
              <Button disabled className="w-full" size="lg">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deploying...</span>
                </div>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Steps Overview */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle>Deployment Steps</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {deploymentSteps.map((step, index) => (
              <div key={step.id}>
                <div 
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    activeStep === step.id 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-border/30 hover:border-border/50'
                  }`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.status === 'completed' ? 'bg-green-500/20' :
                        step.status === 'ready' ? 'bg-primary/20' :
                        step.status === 'deploying' ? 'bg-blue-500/20' :
                        'bg-muted/20'
                      }`}>
                        {getStepIcon(step)}
                      </div>
                      
                      <div>
                        <h4 className="font-medium">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-muted-foreground">{step.estimatedGas}</span>
                      {getStepStatus(step)}
                    </div>
                  </div>
                  
                  {step.dependencies && step.dependencies.length > 0 && (
                    <div className="mt-2 ml-11">
                      <p className="text-xs text-muted-foreground">
                        Requires: {step.dependencies.map(dep => 
                          deploymentSteps.find(s => s.id === dep)?.title
                        ).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                
                {index < deploymentSteps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-px h-4 bg-border/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <Separator className="my-6" />
          
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              className="btn-outline-custom"
              onClick={() => {
                // Deploy all ready steps
                deploymentSteps
                  .filter(step => step.status === 'ready')
                  .forEach(step => handleDeploy(step.id))
              }}
            >
              Deploy All Ready Steps
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
