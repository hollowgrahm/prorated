'use client'

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, Target, Clock, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PoolCreationStepProps, FUNDING_TOKENS, VALIDATION_RULES } from '@/types/pool-creation'

export function FundingParametersStep({
  data,
  onUpdate,
  isValid
}: PoolCreationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get selected funding token info
  const selectedToken = FUNDING_TOKENS.find(token => token.address === data.fundingToken)
  const minTotalContributions = (data.developmentFund || 0) + (data.liquidityFund || 0)

  // Validation logic
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Development fund validation
    if (data.developmentFund !== undefined) {
      if (!data.developmentFund || data.developmentFund <= 0) {
        newErrors.developmentFund = 'Development fund must be greater than 0'
      } else if (data.developmentFund < VALIDATION_RULES.developmentFund.min) {
        newErrors.developmentFund = `Development fund must be at least ${VALIDATION_RULES.developmentFund.min.toLocaleString()}`
      } else if (data.developmentFund > VALIDATION_RULES.developmentFund.max) {
        newErrors.developmentFund = `Development fund must be no more than ${VALIDATION_RULES.developmentFund.max.toLocaleString()}`
      }
    }

    // Liquidity fund validation
    if (data.liquidityFund !== undefined) {
      if (!data.liquidityFund || data.liquidityFund <= 0) {
        newErrors.liquidityFund = 'Liquidity fund must be greater than 0'
      } else if (data.liquidityFund < VALIDATION_RULES.liquidityFund.min) {
        newErrors.liquidityFund = `Liquidity fund must be at least ${VALIDATION_RULES.liquidityFund.min.toLocaleString()}`
      } else if (data.liquidityFund > VALIDATION_RULES.liquidityFund.max) {
        newErrors.liquidityFund = `Liquidity fund must be no more than ${VALIDATION_RULES.liquidityFund.max.toLocaleString()}`
      }
    }

    // Time validation
    if (data.startTime && data.endTime) {
      const now = new Date()
      const startTime = new Date(data.startTime)
      const endTime = new Date(data.endTime)
      const durationDays = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)
      const delayDays = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      if (startTime <= now) {
        newErrors.startTime = 'Start time must be in the future'
      } else if (delayDays > VALIDATION_RULES.timeRange.maxStartDelay) {
        newErrors.startTime = `Start time cannot be more than ${VALIDATION_RULES.timeRange.maxStartDelay} days from now`
      }

      if (endTime <= startTime) {
        newErrors.endTime = 'End time must be after start time'
      } else if (durationDays < VALIDATION_RULES.timeRange.minDuration) {
        newErrors.endTime = `Campaign must run for at least ${VALIDATION_RULES.timeRange.minDuration} day`
      } else if (durationDays > VALIDATION_RULES.timeRange.maxDuration) {
        newErrors.endTime = `Campaign cannot run for more than ${VALIDATION_RULES.timeRange.maxDuration} days`
      }
    }

    setErrors(newErrors)
  }, [data.developmentFund, data.liquidityFund, data.startTime, data.endTime])

  const handleInputChange = (field: string, value: string | number | Date) => {
    onUpdate({ [field]: value })
  }

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return ''
    const d = new Date(date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()) // Adjust for timezone
    return d.toISOString().slice(0, 16) // Format for datetime-local input
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Set your funding goals and campaign timeline. The minimum funding target is the sum of 
          development and liquidity funds. Any additional funds raised will go to liquidity.
        </AlertDescription>
      </Alert>

      {/* Funding Token Selection */}
      <div className="space-y-2">
        <Label htmlFor="fundingToken" className="text-sm font-medium">
          Funding Token *
        </Label>
        <Select
          value={data.fundingToken || ''}
          onValueChange={(value) => handleInputChange('fundingToken', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select funding token" />
          </SelectTrigger>
          <SelectContent>
            {FUNDING_TOKENS.map((token) => (
              <SelectItem key={token.address} value={token.address}>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-muted-foreground">({token.name})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The token contributors will use to fund your project
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Development Fund */}
        <div className="space-y-2">
          <Label htmlFor="developmentFund" className="text-sm font-medium">
            Development Fund * {selectedToken && `(${selectedToken.symbol})`}
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="developmentFund"
              type="number"
              placeholder="e.g., 50000"
              value={data.developmentFund || ''}
              onChange={(e) => handleInputChange('developmentFund', parseInt(e.target.value) || 0)}
              className={`pl-10 ${errors.developmentFund ? 'border-red-500' : ''}`}
              min={VALIDATION_RULES.developmentFund.min}
              max={VALIDATION_RULES.developmentFund.max}
            />
          </div>
          {errors.developmentFund && (
            <p className="text-sm text-red-500">{errors.developmentFund}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Funds allocated for project development and operations
          </p>
        </div>

        {/* Liquidity Fund */}
        <div className="space-y-2">
          <Label htmlFor="liquidityFund" className="text-sm font-medium">
            Liquidity Fund * {selectedToken && `(${selectedToken.symbol})`}
          </Label>
          <div className="relative">
            <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="liquidityFund"
              type="number"
              placeholder="e.g., 30000"
              value={data.liquidityFund || ''}
              onChange={(e) => handleInputChange('liquidityFund', parseInt(e.target.value) || 0)}
              className={`pl-10 ${errors.liquidityFund ? 'border-red-500' : ''}`}
              min={VALIDATION_RULES.liquidityFund.min}
              max={VALIDATION_RULES.liquidityFund.max}
            />
          </div>
          {errors.liquidityFund && (
            <p className="text-sm text-red-500">{errors.liquidityFund}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Minimum funds to seed initial liquidity pool
          </p>
        </div>
      </div>

      {/* Campaign Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="startTime" className="text-sm font-medium">
            Campaign Start Time *
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="startTime"
              type="datetime-local"
              value={formatDateForInput(data.startTime)}
              onChange={(e) => handleInputChange('startTime', new Date(e.target.value))}
              className={`pl-10 ${errors.startTime ? 'border-red-500' : ''}`}
              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} // Tomorrow
            />
          </div>
          {errors.startTime && (
            <p className="text-sm text-red-500">{errors.startTime}</p>
          )}
          <p className="text-xs text-muted-foreground">
            When contributors can start funding your project
          </p>
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <Label htmlFor="endTime" className="text-sm font-medium">
            Campaign End Time *
          </Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="endTime"
              type="datetime-local"
              value={formatDateForInput(data.endTime)}
              onChange={(e) => handleInputChange('endTime', new Date(e.target.value))}
              className={`pl-10 ${errors.endTime ? 'border-red-500' : ''}`}
              min={data.startTime ? formatDateForInput(new Date(data.startTime.getTime() + 24 * 60 * 60 * 1000)) : ''}
            />
          </div>
          {errors.endTime && (
            <p className="text-sm text-red-500">{errors.endTime}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Deadline for funding contributions
          </p>
        </div>
      </div>

      {/* Funding Summary */}
      {minTotalContributions > 0 && selectedToken && (
        <Card className="border-border/50 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <Target className="mr-2 h-4 w-4" />
              Funding Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-2">
                  Development
                </Badge>
                <p className="font-medium">{(data.developmentFund || 0).toLocaleString()} {selectedToken.symbol}</p>
                <p className="text-muted-foreground text-xs">
                  {minTotalContributions > 0 ? ((data.developmentFund || 0) / minTotalContributions * 100).toFixed(1) : 0}% of target
                </p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30 mb-2">
                  Liquidity
                </Badge>
                <p className="font-medium">{(data.liquidityFund || 0).toLocaleString()} {selectedToken.symbol}</p>
                <p className="text-muted-foreground text-xs">
                  {minTotalContributions > 0 ? ((data.liquidityFund || 0) / minTotalContributions * 100).toFixed(1) : 0}% of target
                </p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 mb-2">
                  Total Target
                </Badge>
                <p className="font-medium">{minTotalContributions.toLocaleString()} {selectedToken.symbol}</p>
                <p className="text-muted-foreground text-xs">Minimum to succeed</p>
              </div>
            </div>

            {data.startTime && data.endTime && (
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Campaign Duration: {Math.ceil((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60 * 24))} days
                  <br />
                  Any funds raised above the {minTotalContributions.toLocaleString()} {selectedToken.symbol} target will increase liquidity depth.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Status */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isValid ? 'Funding parameters complete' : 'Please complete all required fields'}
          </span>
        </div>
        {isValid && (
          <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
            ✓ Ready
          </Badge>
        )}
      </div>
    </div>
  )
}
