'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PoolCreationFormData, PoolCreationStep } from '@/types/pool-creation'
import { TokenConfigurationStep } from './creation-steps/token-configuration-step'
import { FundingParametersStep } from './creation-steps/funding-parameters-step'
import { AllocationStep } from './creation-steps/allocation-step'
import { PreviewStep } from './creation-steps/preview-step'

// Define the creation steps
const CREATION_STEPS: PoolCreationStep[] = [
  {
    id: 'token',
    title: 'Token Configuration',
    description: 'Configure your project token details',
    component: TokenConfigurationStep,
    isValid: (data) => {
      return !!(
        data.tokenName?.trim() &&
        data.tokenSymbol?.trim() &&
        data.tokenTotalSupply &&
        data.tokenTotalSupply > 0
      )
    }
  },
  {
    id: 'funding',
    title: 'Funding Parameters',
    description: 'Set funding goals and timeline',
    component: FundingParametersStep,
    isValid: (data) => {
      return !!(
        data.developmentFund &&
        data.liquidityFund &&
        data.fundingToken &&
        data.startTime &&
        data.endTime &&
        data.developmentFund > 0 &&
        data.liquidityFund > 0 &&
        data.startTime < data.endTime
      )
    }
  },
  {
    id: 'allocation',
    title: 'Token Allocation',
    description: 'Configure profit sharing percentages',
    component: AllocationStep,
    isValid: (data) => {
      const total = (data.developerPercent || 0) + (data.treasuryPercent || 0) + (data.daoPercent || 0)
      return total === 100
    }
  },
  {
    id: 'preview',
    title: 'Review & Deploy',
    description: 'Review your configuration and deploy',
    component: PreviewStep,
    isValid: () => true // Preview step is always valid if reached
  }
]

export function PoolCreationWizard() {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [formData, setFormData] = useState<Partial<PoolCreationFormData>>({
    // Set some defaults
    developerPercent: 15,
    treasuryPercent: 25,
    daoPercent: 60,
    salt: generateRandomSalt()
  })

  const currentStep = CREATION_STEPS[currentStepIndex]
  const CurrentStepComponent = currentStep.component
  const isStepValid = currentStep.isValid(formData)
  const progress = ((currentStepIndex + 1) / CREATION_STEPS.length) * 100

  const handleUpdateData = useCallback((updates: Partial<PoolCreationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const handleNext = useCallback(() => {
    if (currentStepIndex < CREATION_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }, [currentStepIndex])

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const handleBackToHome = () => {
    router.push('/pools')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleBackToHome}
                className="btn-outline-custom"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pools
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-accent">Create New Pool</h1>
                <p className="text-sm text-muted-foreground">
                  Launch your decentralized crowdfunding campaign
                </p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              Step {currentStepIndex + 1} of {CREATION_STEPS.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-accent">{currentStep.title}</h2>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% Complete
            </span>
          </div>
          
          <Progress value={progress} className="h-2 mb-4" />
          
          <div className="flex justify-between">
            {CREATION_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const isValid = step.isValid(formData)
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-center ${index < CREATION_STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isCurrent 
                        ? isValid 
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className={`
                      text-xs mt-2 text-center max-w-20
                      ${isCurrent ? 'text-accent font-medium' : 'text-muted-foreground'}
                    `}>
                      {step.title}
                    </span>
                  </div>
                  
                  {index < CREATION_STEPS.length - 1 && (
                    <div className={`
                      flex-1 h-0.5 mx-4 
                      ${isCompleted ? 'bg-green-500' : 'bg-muted'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-accent">{currentStep.title}</CardTitle>
            <p className="text-muted-foreground">{currentStep.description}</p>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-6">
            <CurrentStepComponent
              data={formData}
              onUpdate={handleUpdateData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isValid={isStepValid}
              isFirst={currentStepIndex === 0}
              isLast={currentStepIndex === CREATION_STEPS.length - 1}
            />
          </CardContent>
        </Card>

        {/* Navigation Footer */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {currentStepIndex > 0 && (
              <span>
                Previous: {CREATION_STEPS[currentStepIndex - 1].title}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="btn-outline-custom"
              >
                Previous
              </Button>
            )}
            
            {currentStepIndex < CREATION_STEPS.length - 1 && (
              <Button
                onClick={handleNext}
                disabled={!isStepValid}
                className="btn-primary"
              >
                Next Step
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to generate random salt for CREATE2
function generateRandomSalt(): string {
  return '0x' + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}
