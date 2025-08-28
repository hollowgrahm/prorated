'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown, Settings, Info, TrendingUp, Zap, Gift, Activity, AlertTriangle, X } from 'lucide-react'
import { Project } from '@/types/project'
import { getTokenSymbol } from '@/lib/token-utils'
import { useProswapTrading } from '@/hooks/useProswapTrading'
import { useFaucet } from '@/hooks/useFaucet'

interface ProswapInterfaceProps {
  project: Project
}

interface TokenInfo {
  address: string
  symbol: string
  decimals: number
  isToken80: boolean // true if this is the 80% weighted token, false if 20%
}

// Mock reserves for demo - in real app, fetch from contract
const getMockReserves = (project: Project) => {
  // Simulate realistic reserves for an 80/20 pool
  // Token (80% weight) should have lower reserve than funding token (20% weight)
  return {
    token80Reserve: project.totalSupply * 0.4, // 40% of total supply in LP
    token20Reserve: project.fundingRaised * 0.8, // 80% of funding in LP  
  }
}

// Mock price calculation using weighted AMM formula
const calculateAmountOut = (amountIn: number, reserveIn: number, reserveOut: number, isToken80ToToken20: boolean) => {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) return 0
  
  // Apply 0.3% fee
  const amountInWithFee = amountIn * 0.997
  
  // Simplified weighted AMM calculation (normally would use proper Balancer math)
  // For 80/20 pool: different price impacts depending on direction
  let priceImpactMultiplier
  if (isToken80ToToken20) {
    // Selling the 80% token (more liquid direction)
    priceImpactMultiplier = 0.8
  } else {
    // Buying the 80% token (less liquid direction)  
    priceImpactMultiplier = 1.2
  }
  
  // Basic AMM formula with weight adjustment
  const amountOut = (amountInWithFee * reserveOut * priceImpactMultiplier) / (reserveIn + amountInWithFee)
  return Math.floor(amountOut * 100) / 100 // Round to 2 decimals
}

const calculatePriceImpact = (amountIn: number, amountOut: number, reserveIn: number, reserveOut: number) => {
  if (amountIn <= 0 || amountOut <= 0 || reserveIn <= 0 || reserveOut <= 0) return 0
  
  // Use constant product AMM formula for more accurate price impact
  // Price impact = (amountIn / (reserveIn + amountIn)) * 100
  // This represents how much of the reserve you're consuming
  const priceImpact = (amountIn / (reserveIn + amountIn)) * 100
  
  // Cap at reasonable maximum
  return Math.min(priceImpact, 50)
}

export function ProswapInterface({ project }: ProswapInterfaceProps) {
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isFromToken80, setIsFromToken80] = useState(false) // Start with USDC -> PRO for demo
  const [slippageTolerance, setSlippageTolerance] = useState(0.5) // Default 0.5%
  const [lastEditedField, setLastEditedField] = useState<'from' | 'to'>('from')
  const [showSlippageSettings, setShowSlippageSettings] = useState(false)
  
  const fundingTokenSymbol = getTokenSymbol(project.fundingTokenSymbol)
  
  // Use real trading hook
  const proswapTrading = useProswapTrading(project.address as `0x${string}`)
  const faucet = useFaucet()
  
  // Use real data if available, fallback to mock
  const reserves = proswapTrading.isDemoMode ? {
    token80Reserve: 16800000, // 16.8M PRO tokens (80% of pool)
    token20Reserve: 500000, // 500K USDC (20% of pool) - realistic for launched project
  } : getMockReserves(project)
  
  const isSwapping = proswapTrading.isSwapping || proswapTrading.isApproving || proswapTrading.isConfirming
  
  // Define tokens based on the 80/20 weighting
  const token80: TokenInfo = {
    address: project.tokenAddress,
    symbol: project.symbol,
    decimals: 18,
    isToken80: true
  }
  
  const token20: TokenInfo = {
    address: proswapTrading.isDemoMode ? proswapTrading.usdcAddress || project.fundingTokenSymbol : project.fundingTokenSymbol,
    symbol: proswapTrading.isDemoMode ? 'USDC' : fundingTokenSymbol,
    decimals: 6, // Most stablecoins use 6 decimals
    isToken80: false
  }
  
  const fromToken = isFromToken80 ? token80 : token20
  const toToken = isFromToken80 ? token20 : token80
  const fromReserve = isFromToken80 ? reserves.token80Reserve : reserves.token20Reserve
  const toReserve = isFromToken80 ? reserves.token20Reserve : reserves.token80Reserve

  // Handle input field changes with smart calculation
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    setLastEditedField('from')
    
    if (value && !isNaN(parseFloat(value))) {
      if (proswapTrading.isDemoMode) {
        const fromTokenType = isFromToken80 ? 'PRO' : 'USDC'
        const outputAmount = proswapTrading.calculateOutputAmount(value, fromTokenType)
        setToAmount(outputAmount)
      } else {
        // Use mock calculation for other projects
        const amountIn = parseFloat(value)
        const amountOut = calculateAmountOut(amountIn, fromReserve, toReserve, isFromToken80)
        setToAmount(amountOut.toString())
      }
    } else {
      setToAmount('')
    }
  }

  const handleToAmountChange = (value: string) => {
    setToAmount(value)
    setLastEditedField('to')
    
    if (value && !isNaN(parseFloat(value))) {
      if (proswapTrading.isDemoMode) {
        const toTokenType = isFromToken80 ? 'USDC' : 'PRO'
        const inputAmount = proswapTrading.calculateInputAmount(value, toTokenType)
        setFromAmount(inputAmount)
      } else {
        // Use mock calculation for other projects - reverse calculation
        const amountOut = parseFloat(value)
        // Simplified reverse calculation
        const amountIn = (amountOut * fromReserve) / (toReserve * 0.997)
        setFromAmount(amountIn.toString())
      }
    } else {
      setFromAmount('')
    }
  }

  const handleSwapDirection = () => {
    setIsFromToken80(!isFromToken80)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
    setLastEditedField('from') // Reset to 'from' when swapping direction
  }

  const handleMaxClick = () => {
    if (proswapTrading.isDemoMode) {
      // Use real balances for demo
      const balance = isFromToken80 
        ? parseFloat(proswapTrading.proBalance.formatted)
        : parseFloat(proswapTrading.usdcBalance.formatted)
      handleFromAmountChange(balance.toString())
    } else {
      // Mock user balance for other projects
      const mockBalance = isFromToken80 ? 1000 : 5000
      handleFromAmountChange(mockBalance.toString())
    }
  }

  // Check if we need approval for current trade
  const fromTokenType = isFromToken80 ? 'PRO' : 'USDC'
  const needsApproval = proswapTrading.needsApprovalForTrade(fromTokenType, fromAmount)
  
  const handleApprove = async () => {
    if (!proswapTrading.isDemoMode) return
    
    const fromTokenAddr = isFromToken80 ? proswapTrading.tokenAddress : proswapTrading.usdcAddress
    await proswapTrading.approveToken(fromTokenAddr)
  }

  const handleSwap = async () => {
    if (!proswapTrading.isDemoMode) {
      // Mock swap for other projects
      setTimeout(() => {
        setFromAmount('')
        setToAmount('')
      }, 3000)
      return
    }

    // Real swap execution
    if (lastEditedField === 'from') {
      // User specified exact input amount
      await proswapTrading.swapExactTokensForTokens(
        fromAmount,
        toAmount,
        fromTokenType,
        slippageTolerance
      )
    } else {
      // User specified exact output amount
      await proswapTrading.swapTokensForExactTokens(
        fromAmount,
        toAmount,
        fromTokenType,
        slippageTolerance
      )
    }
    
    // Reset form on success
    if (proswapTrading.isSuccess) {
      setFromAmount('')
      setToAmount('')
      setLastEditedField('from')
    }
  }

  const fromAmountNum = parseFloat(fromAmount) || 0
  const toAmountNum = parseFloat(toAmount) || 0
  
  // Calculate price impact using realistic reserves for demo mode
  const priceImpact = proswapTrading.isDemoMode 
    ? calculatePriceImpact(fromAmountNum, toAmountNum, fromReserve, toReserve)
    : calculatePriceImpact(fromAmountNum, toAmountNum, fromReserve, toReserve)
    
  const rate = proswapTrading.isDemoMode ?
    (fromAmountNum > 0 ? toAmountNum / fromAmountNum : 
     isFromToken80 
       ? parseFloat(proswapTrading.calculateOutputAmount('1', 'PRO'))
       : parseFloat(proswapTrading.calculateOutputAmount('1', 'USDC'))
    ) :
    (fromAmountNum > 0 ? toAmountNum / fromAmountNum : 0)

  const isValidTrade = fromAmountNum > 0 && toAmountNum > 0 && priceImpact < 20 // Max 20% impact for testnet

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {proswapTrading.isDemoMode && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Gift className="h-4 w-4" />
          <AlertDescription>
            <strong>Real Trading:</strong> This is connected to live Prorated Protocol contracts! 
            Get USDC from the faucet below and try real swaps on the testnet.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {proswapTrading.error && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {proswapTrading.error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* USDC Faucet for Demo */}
      {proswapTrading.isDemoMode && (
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Your USDC Balance</p>
                <p className="text-2xl font-bold text-primary">
                  {proswapTrading.usdcBalance.formatted} USDC
                </p>
              </div>
              <Button
                onClick={faucet.claimUSDC}
                disabled={faucet.isLoading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {faucet.isLoading ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-pulse" />
                    Claiming...
                  </>
                ) : (
                  'Get 10K USDC'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Swap Interface */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Proswap Trading</CardTitle>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                80/20 Weighted Pool
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Pool Analytics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-secondary/20 rounded-lg border border-border/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pool Composition</p>
              <p className="text-sm font-medium">{project.symbol} (80%) / {proswapTrading.isDemoMode ? 'USDC' : fundingTokenSymbol} (20%)</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{project.symbol} Price</p>
              <p className="text-sm font-medium">
                {proswapTrading.isDemoMode
                  ? `${proswapTrading.calculateOutputAmount('1', 'PRO')} USDC`
                  : `${(reserves.token20Reserve / reserves.token80Reserve).toFixed(4)} ${fundingTokenSymbol}`
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Trading Fee</p>
              <p className="text-sm font-medium">0.3%</p>
            </div>
          </div>

          {/* Slippage Settings */}
          {showSlippageSettings && (
            <div className="p-3 bg-secondary/20 rounded-lg border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Slippage Tolerance</span>
                <span className="text-xs text-muted-foreground">{slippageTolerance}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={slippageTolerance.toString()} onValueChange={(value) => setSlippageTolerance(parseFloat(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">0.1%</SelectItem>
                    <SelectItem value="0.5">0.5%</SelectItem>
                    <SelectItem value="1.0">1.0%</SelectItem>
                    <SelectItem value="2.0">2.0%</SelectItem>
                    <SelectItem value="5.0">5.0%</SelectItem>
                    <SelectItem value="10.0">10.0%</SelectItem>
                    <SelectItem value="20.0">20.0%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Higher slippage tolerance = lower chance of failed transactions, but potentially worse prices.
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">From</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  Balance: {proswapTrading.isDemoMode ? (
                    isFromToken80 
                      ? parseFloat(proswapTrading.proBalance.formatted).toLocaleString()
                      : parseFloat(proswapTrading.usdcBalance.formatted).toLocaleString()
                  ) : '1,000'} {fromToken.symbol}
                </span>
                {proswapTrading.isDemoMode && (
                  <Badge 
                    variant={needsApproval ? "destructive" : "default"} 
                    className="text-xs px-1 py-0"
                  >
                    {needsApproval ? 'Not Approved' : 'Approved'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                className="text-xl font-mono pr-32"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handleMaxClick}>
                  MAX
                </Button>
                <Badge variant="outline">{fromToken.symbol}</Badge>
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapDirection}
              className="rounded-full p-2 border border-border/50 bg-card hover:bg-primary/10"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">To</span>
              <span className="text-xs text-muted-foreground">
                Balance: {proswapTrading.isDemoMode ? (
                  isFromToken80 
                    ? parseFloat(proswapTrading.usdcBalance.formatted).toLocaleString()
                    : parseFloat(proswapTrading.proBalance.formatted).toLocaleString()
                ) : '5,000'} {toToken.symbol}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={toAmount}
                onChange={(e) => handleToAmountChange(e.target.value)}
                className="text-xl font-mono pr-20 bg-muted/30"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Badge variant="outline">{toToken.symbol}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Trade Details */}
          {fromAmountNum > 0 && toAmountNum > 0 && (
            <div className="space-y-3 p-3 bg-secondary/20 rounded-lg border border-border/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span>
                  {proswapTrading.isDemoMode ? (
                    isFromToken80 
                      ? `1 PRO = ${proswapTrading.calculateOutputAmount('1', 'PRO')} USDC`
                      : `1 USDC = ${proswapTrading.calculateOutputAmount('1', 'USDC')} PRO`
                  ) : (
                    `1 ${fromToken.symbol} = ${rate.toFixed(4)} ${toToken.symbol}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={priceImpact > 5 ? 'text-red-400' : priceImpact > 2 ? 'text-yellow-400' : 'text-green-400'}>
                  {priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trading Fee</span>
                <span>{(fromAmountNum * 0.003).toFixed(4)} {fromToken.symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slippage Tolerance</span>
                <span>{slippageTolerance}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Minimum Received</span>
                <span>{(toAmountNum * (1 - slippageTolerance / 100)).toFixed(4)} {toToken.symbol}</span>
              </div>
            </div>
          )}

          {/* Price Impact Warning */}
          {priceImpact > 5 && (
            <Alert className="border-yellow-500/20 bg-yellow-500/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                High price impact ({priceImpact.toFixed(2)}%). You may receive significantly less tokens than expected.
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction Progress */}
          {proswapTrading.isApproving && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-600">
                    Approving {fromTokenType} Spending
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Granting unlimited spending permission to ProswapRouter
                  </p>
                </div>
              </div>
            </div>
          )}

          {(proswapTrading.isSwapping || proswapTrading.isConfirming) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-600">
                    {proswapTrading.isSwapping ? 'Executing Swap' : 'Confirming Transaction'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {proswapTrading.isSwapping 
                      ? `Swapping ${fromAmount} ${fromToken.symbol} for ${toToken.symbol}`
                      : 'Waiting for blockchain confirmation'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {proswapTrading.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600">Transaction Failed</p>
                  <p className="text-xs text-muted-foreground">
                    {proswapTrading.error.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => proswapTrading.reset()}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Success Message */}
          {proswapTrading.isSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Activity className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-600">Transaction Completed Successfully!</p>
                  <p className="text-xs text-muted-foreground">
                    Your transaction has been confirmed on the blockchain
                  </p>
                  {proswapTrading.txHash && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-mono">
                        {proswapTrading.txHash.slice(0, 10)}...{proswapTrading.txHash.slice(-8)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Hash Display */}
          {proswapTrading.txHash && (proswapTrading.isSwapping || proswapTrading.isConfirming) && (
            <div className="p-2 bg-secondary/20 rounded border border-border/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Transaction Hash:</span>
                <span className="text-xs font-mono text-primary">
                  {proswapTrading.txHash.slice(0, 10)}...{proswapTrading.txHash.slice(-8)}
                </span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={needsApproval ? handleApprove : handleSwap}
            disabled={(!isValidTrade && !needsApproval) || isSwapping}
            className="w-full btn-primary-custom"
            size="lg"
          >
            {isSwapping ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  {proswapTrading.isApproving ? `Approving ${isFromToken80 ? 'PRO' : 'USDC'}...` : 
                   proswapTrading.isSwapping ? `Swapping ${fromAmount} ${fromToken.symbol}...` : 
                   proswapTrading.isConfirming ? 'Confirming Transaction...' : 'Processing...'}
                </span>
              </div>
            ) : proswapTrading.isDemoMode && proswapTrading.isSuccess ? (
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Swap Successful!</span>
              </div>
            ) : needsApproval ? (
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Approve {fromTokenType} Spending</span>
              </div>
            ) : !isValidTrade ? (
              fromAmountNum === 0 ? 'Enter Amount' : 'Invalid Trade'
            ) : (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {proswapTrading.isDemoMode ? 'Swap' : 'Swap'} {fromToken.symbol} for {toToken.symbol}
                </span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>


    </div>
  )
}
