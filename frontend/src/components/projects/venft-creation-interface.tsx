'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { 
  Plus, 
  Lock, 
  Vote, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  Info,
  Activity,
  AlertTriangle,
  Zap,
  Trophy,
  ArrowRight
} from 'lucide-react'
import { Project } from '@/types/project'
import { useVeNFTManagement } from '@/hooks/useVeNFTMinting'
import { parseUnits, formatUnits } from 'viem'

interface VeNFTCreationInterfaceProps {
  project: Project
  onClose: () => void
  onSuccess: (tokenId: number) => void
}

export function VeNFTCreationInterface({ project, onClose, onSuccess }: VeNFTCreationInterfaceProps) {
  const [lpTokenAmount, setLpTokenAmount] = useState('')
  const [lockDuration, setLockDuration] = useState([52]) // Default 1 year
  const [isCreating, setIsCreating] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [createdTokenId, setCreatedTokenId] = useState<number | null>(null)

  // Mock user's LP token balance - in real app, this would come from a hook
  const userLPBalance = 5000 // Mock: User has 5000 LP tokens

  const lockWeeks = lockDuration[0]
  const lockYears = (lockWeeks / 52).toFixed(1)
  
  // Calculate estimated voting power (simplified)
  const lpAmount = parseFloat(lpTokenAmount) || 0
  const estimatedVotingPower = Math.floor(lpAmount * lockWeeks * 0.75)
  
  // Calculate lock end date
  const lockEndDate = new Date(Date.now() + lockWeeks * 7 * 24 * 60 * 60 * 1000)

  const handleCreateVeNFT = async () => {
    if (!lpTokenAmount || parseFloat(lpTokenAmount) <= 0) {
      setError('Please enter a valid LP token amount')
      return
    }

    if (parseFloat(lpTokenAmount) > userLPBalance) {
      setError('Insufficient LP token balance')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // TODO: Implement actual veNFT creation with smart contract
      // const lpAmountWei = parseUnits(lpTokenAmount, 18)
      // const lockDurationSeconds = BigInt(lockWeeks * 7 * 24 * 60 * 60)
      // const result = await createVeNFT(lpAmountWei, lockDurationSeconds)

      // Mock creation process
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      const mockTokenId = Math.floor(Math.random() * 10000) + 1

      setTxHash(mockTxHash)
      setCreatedTokenId(mockTokenId)
      setIsSuccess(true)
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess(mockTokenId)
      }, 2000)

    } catch (error) {
      console.error('veNFT creation failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to create veNFT')
    } finally {
      setIsCreating(false)
    }
  }

  const handleMaxAmount = () => {
    setLpTokenAmount(userLPBalance.toString())
  }

  if (isSuccess && createdTokenId) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-400">veNFT Created Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <Alert className="border-green-500/50 bg-green-500/10">
            <AlertDescription>
              Your veNFT #{createdTokenId} has been created with {lpAmount.toLocaleString()} LP tokens 
              locked for {lockWeeks} weeks.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Token ID</p>
              <p className="font-bold">#{createdTokenId}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Vote className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Voting Power</p>
              <p className="font-bold">{estimatedVotingPower.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Lock Until</p>
              <p className="font-bold text-xs">{lockEndDate.toLocaleDateString()}</p>
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
              onClick={onClose}
            >
              Continue to Governance
              <ArrowRight className="ml-2 h-4 w-4" />
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
          <span>Create New veNFT</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Lock your {project.symbol}/USDC LP tokens to create a veNFT and participate in governance
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* LP Token Balance */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="font-medium mb-2 flex items-center">
            <Info className="h-4 w-4 mr-2 text-primary" />
            Your LP Token Balance
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">{userLPBalance.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{project.symbol}/USDC LP Tokens</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Available to Lock</p>
              <p className="text-xs text-muted-foreground">From trading or providing liquidity</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* LP Token Amount Input */}
        <div className="space-y-3">
          <Label htmlFor="lpAmount" className="text-sm font-medium">
            LP Token Amount to Lock
          </Label>
          <div className="relative">
            <Input
              id="lpAmount"
              type="number"
              placeholder="0.0"
              value={lpTokenAmount}
              onChange={(e) => setLpTokenAmount(e.target.value)}
              className="pr-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMaxAmount}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
            >
              MAX
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Balance: {userLPBalance.toLocaleString()} LP tokens available
          </p>
        </div>

        {/* Lock Duration Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Lock Duration</Label>
            <div className="text-right">
              <p className="text-sm font-bold">{lockWeeks} weeks</p>
              <p className="text-xs text-muted-foreground">({lockYears} years)</p>
            </div>
          </div>
          
          <div className="px-2">
            <Slider
              value={lockDuration}
              onValueChange={setLockDuration}
              max={208} // 4 years max
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1 week</span>
              <span>208 weeks (4 years)</span>
            </div>
          </div>

          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Lock End:</strong> {lockEndDate.toLocaleDateString()} - 
              Longer locks provide more voting power and better rewards.
            </AlertDescription>
          </Alert>
        </div>

        <Separator />

        {/* Estimated Rewards */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <Zap className="h-4 w-4 mr-2 text-primary" />
            Estimated veNFT Benefits
          </h4>
          
          <div className="p-4 bg-muted/30 rounded-lg border border-muted/50">
            <div className="flex items-center mb-2">
              <Vote className="h-4 w-4 text-primary mr-2" />
              <span className="font-medium text-sm">Voting Power</span>
            </div>
            <p className="text-lg font-bold">{estimatedVotingPower.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              Decays linearly over time
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 btn-outline-custom"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateVeNFT}
            disabled={isCreating || !lpTokenAmount || parseFloat(lpTokenAmount) <= 0}
            className="flex-1 btn-primary-custom"
          >
            {isCreating ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Creating veNFT...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Create veNFT
              </>
            )}
          </Button>
        </div>

        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> Once created, your LP tokens will be locked for {lockWeeks} weeks. 
            You can extend the lock duration or add more tokens, but cannot unlock early.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
