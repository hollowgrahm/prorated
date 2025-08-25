'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  FileText, 
  Target, 
  CheckCircle, 
  ExternalLink, 
  Info,
  Activity,
  AlertTriangle,
  Gavel,
  DollarSign,
  Settings,
  ArrowRight
} from 'lucide-react'
import { Project } from '@/types/project'
import { useGovernance, PROPOSAL_TEMPLATES } from '@/hooks/useGovernance'

interface ProposalCreationInterfaceProps {
  project: Project
}

interface ProposalFormData {
  title: string
  description: string
  target: string
  functionName: string
  args: string[]
  category: 'treasury' | 'parameter' | 'upgrade' | 'custom'
}

export function ProposalCreationInterface({ project }: ProposalCreationInterfaceProps) {
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    target: '',
    functionName: '',
    args: [],
    category: 'treasury'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const {
    isCreatingProposal,
    isConfirming,
    isSuccess,
    error,
    txHash,
    createdProposalId,
    createProposal,
    reset
  } = useGovernance(project.governanceAddress as `0x${string}`)

  // Available targets for proposals
  const availableTargets = [
    { value: project.address, label: 'Project Treasury', type: 'treasury' },
    { value: project.pairAddress, label: 'Trading Pool', type: 'protocol' },
    { value: project.lendingAddress || '', label: 'Lending Pool', type: 'protocol' },
    { value: project.governanceAddress || '', label: 'Governance', type: 'governance' }
  ].filter(target => target.value)

  const handleInputChange = (field: keyof ProposalFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleTemplateSelect = (templateKey: keyof typeof PROPOSAL_TEMPLATES) => {
    const template = PROPOSAL_TEMPLATES[templateKey]
    setFormData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      functionName: template.functionName,
      category: template.targetType as ProposalFormData['category']
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Proposal title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Proposal description is required'
    }

    if (!formData.target) {
      newErrors.target = 'Target contract must be selected'
    }

    if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      await createProposal({
        target: formData.target as `0x${string}`,
        functionName: formData.functionName,
        args: formData.args,
        description: `${formData.title}\n\n${formData.description}`
      })
    } catch (error) {
      console.error('Failed to create proposal:', error)
    }
  }

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      target: '',
      functionName: '',
      args: [],
      category: 'treasury'
    })
    setErrors({})
    reset()
  }

  if (isSuccess && createdProposalId) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-400">Proposal Created Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <Alert className="border-green-500/50 bg-green-500/10">
            <AlertDescription>
              Your proposal #{createdProposalId} has been created and will enter voting after a 2-day delay.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Proposal ID</p>
              <p className="font-bold">#{createdProposalId}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Gavel className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-bold">Pending</p>
            </div>
          </div>

          {txHash && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Transaction Hash:</span>
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:text-primary/80"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              className="btn-primary-custom"
              onClick={handleReset}
            >
              Create Another Proposal
              <Plus className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5 text-primary" />
          <span>Create New Proposal</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Propose changes to the protocol (only approved target contracts allowed)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Proposal Templates */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Quick Templates</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => handleTemplateSelect('treasuryFunding')}
              className="h-auto p-4 text-left hover:bg-green-500/10 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-green-400 mt-0.5 group-hover:scale-110 transition-transform duration-200" />
                <div>
                  <p className="font-medium text-sm text-foreground group-hover:text-green-400 transition-colors duration-200">Treasury Funding</p>
                  <p className="text-xs text-muted-foreground">Request funds from treasury</p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTemplateSelect('parameterChange')}
              className="h-auto p-4 text-left hover:bg-blue-500/10 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="flex items-start space-x-3">
                <Settings className="h-5 w-5 text-blue-400 mt-0.5 group-hover:scale-110 group-hover:rotate-90 transition-all duration-200" />
                <div>
                  <p className="font-medium text-sm text-foreground group-hover:text-blue-400 transition-colors duration-200">Parameter Change</p>
                  <p className="text-xs text-muted-foreground">Update protocol settings</p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTemplateSelect('contractUpgrade')}
              className="h-auto p-4 text-left hover:bg-purple-500/10 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="flex items-start space-x-3">
                <ArrowRight className="h-5 w-5 text-purple-400 mt-0.5 group-hover:scale-110 group-hover:translate-x-1 transition-all duration-200" />
                <div>
                  <p className="font-medium text-sm text-foreground group-hover:text-purple-400 transition-colors duration-200">Contract Upgrade</p>
                  <p className="text-xs text-muted-foreground">Upgrade contract logic</p>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Proposal Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Proposal Title *
          </Label>
          <Input
            id="title"
            placeholder="e.g., Increase Development Funding by 50,000 USDC"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={errors.title ? 'border-red-500' : ''}
          />
          {errors.title && (
            <p className="text-xs text-red-400">{errors.title}</p>
          )}
        </div>

        {/* Target Contract */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Target Contract *
          </Label>
          <Select value={formData.target} onValueChange={(value) => handleInputChange('target', value)}>
            <SelectTrigger className={errors.target ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select target contract" />
            </SelectTrigger>
            <SelectContent>
              {availableTargets.map((target) => (
                <SelectItem key={target.value} value={target.value}>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>{target.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.target && (
            <p className="text-xs text-red-400">{errors.target}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Only pre-approved contracts can be targeted by governance proposals
          </p>
        </div>

        {/* Function Name (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="functionName" className="text-sm font-medium">
            Function Name (Optional)
          </Label>
          <Input
            id="functionName"
            placeholder="e.g., transfer, updateParameter, upgrade"
            value={formData.functionName}
            onChange={(e) => handleInputChange('functionName', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for general proposals without specific function calls
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Proposal Description *
          </Label>
          <textarea
            id="description"
            placeholder="Provide a detailed description of the proposal, including rationale, expected outcomes, and any relevant details..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={`w-full min-h-32 p-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${errors.description ? 'border-red-500' : 'border-border'}`}
            rows={4}
          />
          {errors.description && (
            <p className="text-xs text-red-400">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Minimum 50 characters. Be specific about the proposal&apos;s purpose and impact.
          </p>
        </div>

        <Separator />

        {/* Governance Info */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Governance Process:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Proposals cannot be modified after creation</li>
              <li>• Voting starts after a 2-day delay</li>
              <li>• 25% of total veNFT power must participate for quorum</li>
              <li>• Only approved target contracts can be called</li>
              <li>• Successful proposals can be executed by anyone</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Creation Failed:</strong> {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isCreatingProposal || isConfirming}
          className="w-full btn-primary-custom"
          size="lg"
        >
          {isCreatingProposal ? (
            <>
              <Activity className="mr-2 h-5 w-5 animate-spin" />
              Creating Proposal...
            </>
          ) : isConfirming ? (
            <>
              <Activity className="mr-2 h-5 w-5 animate-spin" />
              Confirming Transaction...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-5 w-5" />
              Create Proposal
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
