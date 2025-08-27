'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUpDown, Settings, Info, TrendingUp, Zap, Gift, Activity } from 'lucide-react'
import { Project } from '@/types/project'
import { getTokenSymbol } from '@/lib/token-utils'
import { useDemoProswap } from '@/hooks/useDemoProswap'

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
  const [slippageTolerance] = useState(0.5)
  
  const fundingTokenSymbol = getTokenSymbol(project.fundingTokenSymbol)
  
  // Use demo hook for real contract integration
  const demoProswap = useDemoProswap(project.address as `0x${string}`)
  
  // Use real data if available, fallback to mock
  const reserves = demoProswap.isDemoMode ? {
    token80Reserve: 16800000, // 16.8M PRO tokens (80% of pool)
    token20Reserve: 500000, // 500K USDC (20% of pool) - realistic for launched project
  } : getMockReserves(project)
  
  const isSwapping = demoProswap.isSwapping
  
  // Define tokens based on the 80/20 weighting
  const token80: TokenInfo = {
    address: project.tokenAddress,
    symbol: project.symbol,
    decimals: 18,
    isToken80: true
  }
  
  const token20: TokenInfo = {
    address: demoProswap.isDemoMode ? demoProswap.usdcAddress || project.fundingTokenSymbol : project.fundingTokenSymbol,
    symbol: demoProswap.isDemoMode ? 'USDC' : fundingTokenSymbol,
    decimals: 6, // Most stablecoins use 6 decimals
    isToken80: false
  }
  
  const fromToken = isFromToken80 ? token80 : token20
  const toToken = isFromToken80 ? token20 : token80
  const fromReserve = isFromToken80 ? reserves.token80Reserve : reserves.token20Reserve
  const toReserve = isFromToken80 ? reserves.token20Reserve : reserves.token80Reserve

  // Calculate output amount when input changes
  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      if (demoProswap.isDemoMode) {
        // Use demo calculation with real exchange rates
        const fromTokenType = isFromToken80 ? 'PRO' : 'USDC'
        const outputAmount = demoProswap.calculateOutputAmount(fromAmount, fromTokenType)
        setToAmount(outputAmount)
      } else {
        // Use mock calculation for other projects
        const amountIn = parseFloat(fromAmount)
        const amountOut = calculateAmountOut(amountIn, fromReserve, toReserve, isFromToken80)
        setToAmount(amountOut.toString())
      }
    } else {
      setToAmount('')
    }
  }, [fromAmount, fromReserve, toReserve, isFromToken80, demoProswap])

  const handleSwapDirection = () => {
    setIsFromToken80(!isFromToken80)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleMaxClick = () => {
    if (demoProswap.isDemoMode) {
      // Use real balances for demo
      const balance = isFromToken80 
        ? parseFloat(demoProswap.proBalance.formatted)
        : parseFloat(demoProswap.usdcBalance.formatted)
      setFromAmount(balance.toString())
    } else {
      // Mock user balance for other projects
      const mockBalance = isFromToken80 ? 1000 : 5000
      setFromAmount(mockBalance.toString())
    }
  }

  const handleSwap = async () => {
    if (demoProswap.isDemoMode) {
      // Use demo swap simulation
      const fromTokenType = isFromToken80 ? 'PRO' : 'USDC'
      await demoProswap.executeSwap(fromTokenType, fromAmount)
      
      // Reset form on success
      if (demoProswap.isSuccess) {
        setFromAmount('')
        setToAmount('')
      }
    } else {
      // Mock swap for other projects
      setTimeout(() => {
        setFromAmount('')
        setToAmount('')
      }, 3000)
    }
  }

  const fromAmountNum = parseFloat(fromAmount) || 0
  const toAmountNum = parseFloat(toAmount) || 0
  
  // Calculate price impact using realistic reserves for demo mode
  const priceImpact = demoProswap.isDemoMode 
    ? calculatePriceImpact(fromAmountNum, toAmountNum, fromReserve, toReserve)
    : calculatePriceImpact(fromAmountNum, toAmountNum, fromReserve, toReserve)
    
  const rate = fromAmountNum > 0 ? toAmountNum / fromAmountNum : 0

  const isValidTrade = fromAmountNum > 0 && toAmountNum > 0 && priceImpact < 10 // Max 10% impact

  return (
    <div className="space-y-6">
      {/* Demo Notice */}
      {demoProswap.isDemoMode && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <Gift className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Trading:</strong> This is connected to real Prorated Protocol contracts! 
            Get USDC from the faucet below and try purchasing PRO tokens on the live DEX.
          </AlertDescription>
        </Alert>
      )}

      {/* USDC Faucet for Demo */}
      {demoProswap.isDemoMode && (
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Your USDC Balance</p>
                <p className="text-2xl font-bold text-primary">
                  {demoProswap.usdcBalance.formatted} USDC
                </p>
              </div>
              <Button
                onClick={demoProswap.faucet.claimUSDC}
                disabled={demoProswap.faucet.isLoading}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {demoProswap.faucet.isLoading ? (
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
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Pool Analytics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-secondary/20 rounded-lg border border-border/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pool Composition</p>
              <p className="text-sm font-medium">{project.symbol} (80%) / {demoProswap.isDemoMode ? 'USDC' : fundingTokenSymbol} (20%)</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{project.symbol} Price</p>
              <p className="text-sm font-medium">
                {demoProswap.isDemoMode 
                  ? `${demoProswap.exchangeRate.proToUsdc.toFixed(4)} USDC`
                  : `${(reserves.token20Reserve / reserves.token80Reserve).toFixed(4)} ${fundingTokenSymbol}`
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Trading Fee</p>
              <p className="text-sm font-medium">0.3%</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">From</span>
              <span className="text-xs text-muted-foreground">
                Balance: {demoProswap.isDemoMode ? (
                  isFromToken80 
                    ? parseFloat(demoProswap.proBalance.formatted).toLocaleString()
                    : parseFloat(demoProswap.usdcBalance.formatted).toLocaleString()
                ) : '1,000'} {fromToken.symbol}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
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
                Balance: {demoProswap.isDemoMode ? (
                  isFromToken80 
                    ? parseFloat(demoProswap.usdcBalance.formatted).toLocaleString()
                    : parseFloat(demoProswap.proBalance.formatted).toLocaleString()
                ) : '5,000'} {toToken.symbol}
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={toAmount}
                readOnly
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
                  {demoProswap.isDemoMode ? (
                    isFromToken80 
                      ? `1 PRO = ${demoProswap.exchangeRate.proToUsdc.toFixed(4)} USDC`
                      : `1 USDC = ${demoProswap.exchangeRate.usdcToPro.toFixed(4)} PRO`
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

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!isValidTrade || isSwapping}
            className="w-full btn-primary-custom"
            size="lg"
          >
            {isSwapping ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>
                  {demoProswap.isDemoMode && demoProswap.isConfirming ? 'Confirming...' : 'Swapping...'}
                </span>
              </div>
            ) : demoProswap.isDemoMode && demoProswap.isSuccess ? (
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Swap Successful!</span>
              </div>
            ) : !isValidTrade ? (
              fromAmountNum === 0 ? 'Enter Amount' : 'Invalid Trade'
            ) : (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {demoProswap.isDemoMode ? 'Demo Swap' : 'Swap'} {fromToken.symbol} for {toToken.symbol}
                </span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>


    </div>
  )
}
