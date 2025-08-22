'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Eye, 
  Rocket, 
  Check, 
  AlertTriangle, 
  Clock, 
  Target, 
  Users, 
  Coins,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PoolCreationStepProps, FUNDING_TOKENS } from '@/types/pool-creation'
import { toTokenUnits } from '@/lib/token-precision'

export function PreviewStep({
  data
}: PoolCreationStepProps) {
  const router = useRouter()
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentTx, setDeploymentTx] = useState<string>('')
  const [deployedPoolAddress, setDeployedPoolAddress] = useState<string>('')

  const selectedToken = FUNDING_TOKENS.find(token => token.address === data.fundingToken)
  const minTotalContributions = (data.developmentFund || 0) + (data.liquidityFund || 0)
  const campaignDuration = data.startTime && data.endTime 
    ? Math.ceil((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const handleDeploy = async () => {
    setIsDeploying(true)
    
    try {
      // TODO: Implement actual pool deployment
      // const result = await deployPool({
      //   tokenName: data.tokenName!,
      //   tokenSymbol: data.tokenSymbol!,
      //   tokenTotalSupply: toTokenUnits(data.tokenTotalSupply!), // Convert to 18 decimal precision
      //   developmentFund: data.developmentFund!,
      //   liquidityFund: data.liquidityFund!,
      //   fundingToken: data.fundingToken!,
      //   startTime: Math.floor(data.startTime!.getTime() / 1000),
      //   endTime: Math.floor(data.endTime!.getTime() / 1000),
      //   developerPercent: data.developerPercent!,
      //   treasuryPercent: data.treasuryPercent!,
      //   daoPercent: data.daoPercent!,
      //   salt: data.salt!
      // })

      // Mock deployment for now
      await new Promise(resolve => setTimeout(resolve, 3000))
      const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
      const mockPoolAddress = '0x' + Array.from({ length: 40 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')

      setDeploymentTx(mockTxHash)
      setDeployedPoolAddress(mockPoolAddress)
      
      // Redirect to the new pool page after a short delay
      setTimeout(() => {
        router.push(`/pools/${mockPoolAddress}`)
      }, 2000)

    } catch (error) {
      console.error('Deployment failed:', error)
    } finally {
      setIsDeploying(false)
    }
  }

  if (deployedPoolAddress) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-accent mb-2">Pool Deployed Successfully!</h3>
          <p className="text-muted-foreground">
            Your crowdfunding pool is now live and ready to accept contributions.
          </p>
        </div>

        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pool Address:</span>
              <a
                href={`https://etherscan.io/address/${deployedPoolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-primary hover:text-primary/80"
              >
                {deployedPoolAddress.slice(0, 10)}...{deployedPoolAddress.slice(-8)}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
            
            {deploymentTx && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transaction:</span>
                <a
                  href={`https://etherscan.io/tx/${deploymentTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-primary hover:text-primary/80"
                >
                  {deploymentTx.slice(0, 10)}...{deploymentTx.slice(-8)}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Redirecting to your pool page...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-accent mb-2">Review Your Pool Configuration</h3>
        <p className="text-muted-foreground">
          Please review all details before deploying your crowdfunding pool to the blockchain.
        </p>
      </div>

      {/* Pool Overview */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Coins className="mr-2 h-5 w-5" />
            {data.tokenName} ({data.tokenSymbol})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Supply</p>
              <p className="font-medium">{data.tokenTotalSupply?.toLocaleString()} tokens</p>
            </div>
            <div>
              <p className="text-muted-foreground">Funding Token</p>
              <p className="font-medium">{selectedToken?.symbol || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Campaign Duration</p>
              <p className="font-medium">{campaignDuration} days</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Amount</p>
              <p className="font-medium">{minTotalContributions.toLocaleString()} {selectedToken?.symbol}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Details */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Funding Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-1">
                  Development Fund
                </Badge>
                <p className="font-medium">{data.developmentFund?.toLocaleString()} {selectedToken?.symbol}</p>
                <p className="text-xs text-muted-foreground">
                  {minTotalContributions > 0 ? ((data.developmentFund || 0) / minTotalContributions * 100).toFixed(1) : 0}% of target
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30 mb-1">
                  Liquidity Fund
                </Badge>
                <p className="font-medium">{data.liquidityFund?.toLocaleString()} {selectedToken?.symbol}</p>
                <p className="text-xs text-muted-foreground">
                  {minTotalContributions > 0 ? ((data.liquidityFund || 0) / minTotalContributions * 100).toFixed(1) : 0}% of target
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Campaign Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Start Time</p>
              <p className="font-medium">{data.startTime?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">End Time</p>
              <p className="font-medium">{data.endTime?.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Allocation */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            LP Token Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Visual representation */}
            <div className="relative h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-blue-500"
                style={{ width: `${data.developerPercent}%` }}
              />
              <div 
                className="absolute top-0 h-full bg-green-500"
                style={{ 
                  left: `${data.developerPercent}%`,
                  width: `${data.treasuryPercent}%` 
                }}
              />
              <div 
                className="absolute top-0 h-full bg-primary"
                style={{ 
                  left: `${(data.developerPercent || 0) + (data.treasuryPercent || 0)}%`,
                  width: `${data.daoPercent}%` 
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Developer: {data.developerPercent}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Treasury: {data.treasuryPercent}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded" />
                <span>DAO: {data.daoPercent}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Salt */}
      <Card className="border-border/50 bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Deployment Salt:</span>
            <span className="text-sm font-mono">{data.salt}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This ensures a unique pool address for CREATE2 deployment
          </p>
        </CardContent>
      </Card>

      {/* Warnings */}
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Once deployed, these parameters cannot be changed. 
          Please review everything carefully before proceeding.
        </AlertDescription>
      </Alert>

      <Separator />

      {/* Deploy Button */}
      <div className="text-center space-y-4">
        <Button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="btn-primary w-full md:w-auto px-8 py-3 text-lg"
          size="lg"
        >
          {isDeploying ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Deploying Pool...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-5 w-5" />
              Deploy Pool
            </>
          )}
        </Button>
        
        <p className="text-sm text-muted-foreground">
          This will create your pool on the blockchain and make it available for contributions.
        </p>
      </div>
    </div>
  )
}
