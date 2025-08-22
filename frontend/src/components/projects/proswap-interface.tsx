'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUpDown, Settings, Info, TrendingUp, Zap } from 'lucide-react'
import { Project } from '@/types/project'
import { getTokenSymbol } from '@/lib/token-utils'

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
  if (amountIn <= 0 || amountOut <= 0) return 0
  
  const spotPrice = reserveOut / reserveIn
  const executionPrice = amountOut / amountIn
  const priceImpact = ((spotPrice - executionPrice) / spotPrice) * 100
  
  return Math.abs(priceImpact)
}

export function ProswapInterface({ project }: ProswapInterfaceProps) {
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isFromToken80, setIsFromToken80] = useState(true) // Start with project token -> funding token
  const [slippageTolerance, setSlippageTolerance] = useState(0.5)
  const [isSwapping, setIsSwapping] = useState(false)
  
  const fundingTokenSymbol = getTokenSymbol(project.fundingTokenSymbol)
  const reserves = getMockReserves(project)
  
  // Define tokens based on the 80/20 weighting
  const token80: TokenInfo = {
    address: project.tokenAddress,
    symbol: project.symbol,
    decimals: 18,
    isToken80: true
  }
  
  const token20: TokenInfo = {
    address: project.fundingTokenSymbol, // Using symbol as address for demo
    symbol: fundingTokenSymbol,
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
      const amountIn = parseFloat(fromAmount)
      const amountOut = calculateAmountOut(amountIn, fromReserve, toReserve, isFromToken80)
      setToAmount(amountOut.toString())
    } else {
      setToAmount('')
    }
  }, [fromAmount, fromReserve, toReserve, isFromToken80])

  const handleSwapDirection = () => {
    setIsFromToken80(!isFromToken80)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleMaxClick = () => {
    // Mock user balance - in real app, fetch from wallet
    const mockBalance = isFromToken80 ? 1000 : 5000
    setFromAmount(mockBalance.toString())
  }

  const handleSwap = async () => {
    setIsSwapping(true)
    
    // Simulate transaction
    setTimeout(() => {
      setIsSwapping(false)
      setFromAmount('')
      setToAmount('')
      // In real app: execute swap transaction
    }, 3000)
  }

  const fromAmountNum = parseFloat(fromAmount) || 0
  const toAmountNum = parseFloat(toAmount) || 0
  const priceImpact = calculatePriceImpact(fromAmountNum, toAmountNum, fromReserve, toReserve)
  const rate = fromAmountNum > 0 ? toAmountNum / fromAmountNum : 0

  const isValidTrade = fromAmountNum > 0 && toAmountNum > 0 && priceImpact < 10 // Max 10% impact

  return (
    <div className="space-y-6">


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
              <p className="text-sm font-medium">{project.symbol} (80%) / {fundingTokenSymbol} (20%)</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{project.symbol} Price</p>
              <p className="text-sm font-medium">{(reserves.token20Reserve / reserves.token80Reserve).toFixed(4)} {fundingTokenSymbol}</p>
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
                Balance: 1,000 {fromToken.symbol}
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
                Balance: 5,000 {toToken.symbol}
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
                <span>1 {fromToken.symbol} = {rate.toFixed(4)} {toToken.symbol}</span>
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
                <span>Swapping...</span>
              </div>
            ) : !isValidTrade ? (
              fromAmountNum === 0 ? 'Enter Amount' : 'Invalid Trade'
            ) : (
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Swap {fromToken.symbol} for {toToken.symbol}</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>


    </div>
  )
}
