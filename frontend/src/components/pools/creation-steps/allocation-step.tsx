'use client'

import { useState, useEffect } from 'react'
import { PieChart, Users, Building, Vote, Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PoolCreationStepProps, VALIDATION_RULES } from '@/types/pool-creation'

export function AllocationStep({
  data,
  onUpdate,
  isValid
}: PoolCreationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const developerPercent = data.developerPercent || 15
  const treasuryPercent = data.treasuryPercent || 25
  const daoPercent = data.daoPercent || 60
  const totalPercent = developerPercent + treasuryPercent + daoPercent

  // Validation logic
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    if (totalPercent !== 100) {
      newErrors.allocation = `Total allocation must equal 100% (currently ${totalPercent}%)`
    }

    if (developerPercent < VALIDATION_RULES.percentages.min || developerPercent > VALIDATION_RULES.percentages.max) {
      newErrors.developer = `Developer allocation must be between ${VALIDATION_RULES.percentages.min}% and ${VALIDATION_RULES.percentages.max}%`
    }

    if (treasuryPercent < VALIDATION_RULES.percentages.min || treasuryPercent > VALIDATION_RULES.percentages.max) {
      newErrors.treasury = `Treasury allocation must be between ${VALIDATION_RULES.percentages.min}% and ${VALIDATION_RULES.percentages.max}%`
    }

    if (daoPercent < VALIDATION_RULES.percentages.min || daoPercent > VALIDATION_RULES.percentages.max) {
      newErrors.dao = `DAO allocation must be between ${VALIDATION_RULES.percentages.min}% and ${VALIDATION_RULES.percentages.max}%`
    }

    setErrors(newErrors)
  }, [developerPercent, treasuryPercent, daoPercent, totalPercent])

  const handlePercentageChange = (field: string, value: number) => {
    onUpdate({ [field]: Math.max(0, Math.min(100, value)) })
  }

  const handleSliderChange = (field: string, values: number[]) => {
    handlePercentageChange(field, values[0])
  }

  const autoBalance = () => {
    // Auto-balance to make total = 100%
    const remaining = 100 - totalPercent
    const adjustment = remaining / 3
    
    onUpdate({
      developerPercent: Math.round(Math.max(1, developerPercent + adjustment)),
      treasuryPercent: Math.round(Math.max(1, treasuryPercent + adjustment)),
      daoPercent: Math.round(Math.max(1, daoPercent + adjustment))
    })
  }

  const resetToDefaults = () => {
    onUpdate({
      developerPercent: 15,
      treasuryPercent: 25,
      daoPercent: 60
    })
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Configure how LP tokens from the liquidity pool will be distributed among stakeholders. 
          These allocations determine voting power and profit sharing in your project.
        </AlertDescription>
      </Alert>

      {/* Current Total Display */}
      <Card className={`border-2 ${totalPercent === 100 ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Total Allocation
            </CardTitle>
            <Badge 
              variant="outline" 
              className={`text-lg px-3 py-1 ${
                totalPercent === 100 
                  ? 'bg-green-500/20 text-green-300 border-green-500/50' 
                  : totalPercent > 100
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
              }`}
            >
              {totalPercent}%
            </Badge>
          </div>
        </CardHeader>
        {totalPercent !== 100 && (
          <CardContent className="pt-0">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                {totalPercent > 100 ? 'Total exceeds 100%' : 'Total is less than 100%'}
              </span>
              <button
                onClick={autoBalance}
                className="text-sm text-primary hover:text-primary/80 underline"
              >
                Auto Balance
              </button>
              <button
                onClick={resetToDefaults}
                className="text-sm text-primary hover:text-primary/80 underline"
              >
                Reset to Defaults
              </button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Allocation Controls */}
      <div className="space-y-6">
        {/* Developer Allocation */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Developer Allocation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  LP tokens allocated to the project developer/team
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label htmlFor="developerPercent" className="text-sm">Percentage</Label>
                <Input
                  id="developerPercent"
                  type="number"
                  min={1}
                  max={99}
                  value={developerPercent}
                  onChange={(e) => handlePercentageChange('developerPercent', parseInt(e.target.value) || 0)}
                  className={errors.developer ? 'border-red-500' : ''}
                />
                {errors.developer && (
                  <p className="text-xs text-red-500 mt-1">{errors.developer}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Visual Control</Label>
                <Slider
                  value={[developerPercent]}
                  onValueChange={(values) => handleSliderChange('developerPercent', values)}
                  max={100}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: 10-20%. Covers development costs and incentivizes long-term commitment.
            </p>
          </CardContent>
        </Card>

        {/* Treasury Allocation */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Building className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Treasury Allocation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  LP tokens held by project treasury for operations
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label htmlFor="treasuryPercent" className="text-sm">Percentage</Label>
                <Input
                  id="treasuryPercent"
                  type="number"
                  min={1}
                  max={99}
                  value={treasuryPercent}
                  onChange={(e) => handlePercentageChange('treasuryPercent', parseInt(e.target.value) || 0)}
                  className={errors.treasury ? 'border-red-500' : ''}
                />
                {errors.treasury && (
                  <p className="text-xs text-red-500 mt-1">{errors.treasury}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Visual Control</Label>
                <Slider
                  value={[treasuryPercent]}
                  onValueChange={(values) => handleSliderChange('treasuryPercent', values)}
                  max={100}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: 20-30%. Funds ongoing operations, marketing, and future development.
            </p>
          </CardContent>
        </Card>

        {/* DAO Allocation */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Vote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">DAO Allocation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  LP tokens distributed to contributors based on their shares
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label htmlFor="daoPercent" className="text-sm">Percentage</Label>
                <Input
                  id="daoPercent"
                  type="number"
                  min={1}
                  max={99}
                  value={daoPercent}
                  onChange={(e) => handlePercentageChange('daoPercent', parseInt(e.target.value) || 0)}
                  className={errors.dao ? 'border-red-500' : ''}
                />
                {errors.dao && (
                  <p className="text-xs text-red-500 mt-1">{errors.dao}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Visual Control</Label>
                <Slider
                  value={[daoPercent]}
                  onValueChange={(values) => handleSliderChange('daoPercent', values)}
                  max={100}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended: 50-70%. Higher allocation increases community ownership and governance power.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Allocation Preview */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <PieChart className="mr-2 h-4 w-4" />
            Allocation Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Visual representation */}
            <div className="relative h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(developerPercent / 100) * 100}%` }}
              />
              <div 
                className="absolute top-0 h-full bg-green-500 transition-all duration-300"
                style={{ 
                  left: `${(developerPercent / 100) * 100}%`,
                  width: `${(treasuryPercent / 100) * 100}%` 
                }}
              />
              <div 
                className="absolute top-0 h-full bg-primary transition-all duration-300"
                style={{ 
                  left: `${((developerPercent + treasuryPercent) / 100) * 100}%`,
                  width: `${(daoPercent / 100) * 100}%` 
                }}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Developer: {developerPercent}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Treasury: {treasuryPercent}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded" />
                <span>DAO: {daoPercent}%</span>
              </div>
            </div>

            <Separator />

            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                These allocations determine governance voting power and profit sharing from trading fees. 
                Contributors receive DAO allocation proportional to their share of total contributions.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Step Status */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isValid ? 'Token allocation complete' : 'Total allocation must equal 100%'}
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
