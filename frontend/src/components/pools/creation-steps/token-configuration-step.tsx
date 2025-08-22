'use client'

import { useState, useEffect } from 'react'
import { Info, Coins, Type, Hash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PoolCreationStepProps, VALIDATION_RULES } from '@/types/pool-creation'

export function TokenConfigurationStep({
  data,
  onUpdate,
  isValid
}: PoolCreationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation logic
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Token name validation
    if (data.tokenName !== undefined) {
      if (!data.tokenName.trim()) {
        newErrors.tokenName = 'Token name is required'
      } else if (data.tokenName.length < VALIDATION_RULES.tokenName.minLength) {
        newErrors.tokenName = `Token name must be at least ${VALIDATION_RULES.tokenName.minLength} character`
      } else if (data.tokenName.length > VALIDATION_RULES.tokenName.maxLength) {
        newErrors.tokenName = `Token name must be no more than ${VALIDATION_RULES.tokenName.maxLength} characters`
      }
    }

    // Token symbol validation
    if (data.tokenSymbol !== undefined) {
      if (!data.tokenSymbol.trim()) {
        newErrors.tokenSymbol = 'Token symbol is required'
      } else if (data.tokenSymbol.length < VALIDATION_RULES.tokenSymbol.minLength) {
        newErrors.tokenSymbol = `Token symbol must be at least ${VALIDATION_RULES.tokenSymbol.minLength} character`
      } else if (data.tokenSymbol.length > VALIDATION_RULES.tokenSymbol.maxLength) {
        newErrors.tokenSymbol = `Token symbol must be no more than ${VALIDATION_RULES.tokenSymbol.maxLength} characters`
      } else if (!/^[A-Z0-9]+$/.test(data.tokenSymbol)) {
        newErrors.tokenSymbol = 'Token symbol must contain only uppercase letters and numbers'
      }
    }

    // Token supply validation
    if (data.tokenTotalSupply !== undefined) {
      if (!data.tokenTotalSupply || data.tokenTotalSupply <= 0) {
        newErrors.tokenTotalSupply = 'Token supply must be greater than 0'
      } else if (!Number.isInteger(data.tokenTotalSupply)) {
        newErrors.tokenTotalSupply = 'Token supply must be a whole number'
      }
    }

    setErrors(newErrors)
  }, [data.tokenName, data.tokenSymbol, data.tokenTotalSupply])

  const handleInputChange = (field: string, value: string | number) => {
    onUpdate({ [field]: value })
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure the basic details for your project token. This token will represent ownership 
          and voting rights in your project after successful funding.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Token Name */}
        <div className="space-y-2">
          <Label htmlFor="tokenName" className="text-sm font-medium">
            Token Name *
          </Label>
          <div className="relative">
            <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="tokenName"
              placeholder="e.g., DeFi Protocol Token"
              value={data.tokenName || ''}
              onChange={(e) => handleInputChange('tokenName', e.target.value)}
              className={`pl-10 ${errors.tokenName ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.tokenName && (
            <p className="text-sm text-red-500">{errors.tokenName}</p>
          )}
                      <p className="text-xs text-muted-foreground">
              The full name of your project token (e.g., &ldquo;DeFi Protocol Token&rdquo;)
            </p>
        </div>

        {/* Token Symbol */}
        <div className="space-y-2">
          <Label htmlFor="tokenSymbol" className="text-sm font-medium">
            Token Symbol *
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="tokenSymbol"
              placeholder="e.g., DEFI"
              value={data.tokenSymbol || ''}
              onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
              className={`pl-10 ${errors.tokenSymbol ? 'border-red-500' : ''}`}
              maxLength={VALIDATION_RULES.tokenSymbol.maxLength}
            />
          </div>
          {errors.tokenSymbol && (
            <p className="text-sm text-red-500">{errors.tokenSymbol}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Short ticker symbol for your token (2-10 uppercase letters/numbers)
          </p>
        </div>
      </div>

      {/* Token Supply */}
      <div className="space-y-2">
        <Label htmlFor="tokenTotalSupply" className="text-sm font-medium">
          Total Token Supply *
        </Label>
        <div className="relative">
          <Coins className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            id="tokenTotalSupply"
            type="number"
            placeholder="e.g., 1000000"
            value={data.tokenTotalSupply || ''}
            onChange={(e) => handleInputChange('tokenTotalSupply', parseInt(e.target.value) || 0)}
            className={`pl-10 ${errors.tokenTotalSupply ? 'border-red-500' : ''}`}
            min={1}
          />
        </div>
        {errors.tokenTotalSupply && (
          <p className="text-sm text-red-500">{errors.tokenTotalSupply}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Total number of tokens that will be created (enter the human-readable amount, e.g., 1000000 for 1 million tokens)
        </p>
      </div>

      {/* Token Distribution Preview */}
      {data.tokenTotalSupply && data.tokenTotalSupply > 0 && (
        <Card className="border-border/50 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <Coins className="mr-2 h-4 w-4" />
              Token Distribution Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="text-center">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 mb-2">
                  80/20 Liquidity Pool
                </Badge>
                <p className="font-medium text-lg">100%</p>
                <p className="text-muted-foreground text-xs">
                  {data.tokenTotalSupply.toLocaleString()} tokens
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Paired with liquidity fund
                </p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="bg-muted/20 text-muted-foreground border-muted/30 mb-2">
                  Direct Distribution
                </Badge>
                <p className="font-medium text-lg">0%</p>
                <p className="text-muted-foreground text-xs">
                  0 tokens
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  All tokens go to liquidity
                </p>
              </div>
            </div>
            
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                All tokens will be paired with the liquidity fund in an 80/20 weighted pool (80% token weight, 20% funding token weight) for optimal price stability and deep liquidity.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step Status */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isValid ? 'Token configuration complete' : 'Please complete all required fields'}
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
