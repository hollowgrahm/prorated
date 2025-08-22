'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, Shield, Zap, Info, DollarSign, Target, AlertTriangle } from 'lucide-react'
import { Project } from '@/types/project'
import { getTokenSymbol } from '@/lib/token-utils'

interface ProlendInterfaceProps {
  project: Project
}

interface LendingPair {
  address: string
  assetToken: {
    address: string
    symbol: string
    isToken80: boolean
  }
  collateralToken: {
    address: string
    symbol: string
    isToken80: boolean
  }
  // Mock data - in real app, fetch from contracts
  totalDeposited: number
  totalBorrowed: number
  utilizationRate: number
  depositAPY: number
  borrowAPY: number
  availableLiquidity: number
  maxLTV: number
}

// Mock lending pair data
const getMockLendingPairs = (project: Project): { pair80: LendingPair; pair20: LendingPair } => {
  const fundingTokenSymbol = getTokenSymbol(project.fundingTokenSymbol)
  
  return {
    // Pair 80: Project token as asset, funding token as collateral
    pair80: {
      address: `${project.address}_pair80`,
      assetToken: {
        address: project.tokenAddress,
        symbol: project.symbol,
        isToken80: true
      },
      collateralToken: {
        address: project.fundingTokenSymbol,
        symbol: fundingTokenSymbol,
        isToken80: false
      },
      totalDeposited: project.totalSupply * 0.15, // 15% of token supply deposited
      totalBorrowed: project.fundingRaised * 0.3, // 30% of funding borrowed
      utilizationRate: 65,
      depositAPY: 8.5,
      borrowAPY: 12.2,
      availableLiquidity: project.totalSupply * 0.05,
      maxLTV: 75
    },
    // Pair 20: Funding token as asset, project token as collateral  
    pair20: {
      address: `${project.address}_pair20`,
      assetToken: {
        address: project.fundingTokenSymbol,
        symbol: fundingTokenSymbol,
        isToken80: false
      },
      collateralToken: {
        address: project.tokenAddress,
        symbol: project.symbol,
        isToken80: true
      },
      totalDeposited: project.fundingRaised * 0.25, // 25% of funding deposited
      totalBorrowed: project.totalSupply * 0.1, // 10% of tokens borrowed
      utilizationRate: 40,
      depositAPY: 5.2,
      borrowAPY: 8.8,
      availableLiquidity: project.fundingRaised * 0.15,
      maxLTV: 75
    }
  }
}

export function ProlendInterface({ project }: ProlendInterfaceProps) {
  const [activeTab, setActiveTab] = useState('lend')
  const [selectedPair, setSelectedPair] = useState<'pair80' | 'pair20'>('pair80')
  const [amount, setAmount] = useState('')
  const [collateralAmount, setCollateralAmount] = useState('')
  const [isTransacting, setIsTransacting] = useState(false)
  
  const fundingTokenSymbol = getTokenSymbol(project.fundingTokenSymbol)
  const lendingPairs = getMockLendingPairs(project)
  const currentPair = lendingPairs[selectedPair]
  
  // Calculate max borrow amount based on collateral
  const collateralValue = parseFloat(collateralAmount) || 0
  const maxBorrowAmount = (collateralValue * currentPair.maxLTV) / 100
  
  // Calculate liquidation risk
  const borrowAmount = parseFloat(amount) || 0
  const liquidationPrice = borrowAmount > 0 ? (borrowAmount * 1.33) / collateralValue : 0 // ~75% LTV threshold
  
  const handleTransaction = async () => {
    setIsTransacting(true)
    
    // Simulate transaction
    setTimeout(() => {
      setIsTransacting(false)
      setAmount('')
      setCollateralAmount('')
      // In real app: execute transaction
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {/* Lending Pairs Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pair 80: Project Token as Asset */}
        <Card className={`border-2 transition-all duration-200 cursor-pointer ${
          selectedPair === 'pair80' 
            ? 'border-primary bg-primary/5' 
            : 'border-border/50 bg-card/95 hover:border-primary/50'
        } backdrop-blur-sm shadow-lg`}
        onClick={() => setSelectedPair('pair80')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>{project.symbol} Lending Pool</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Asset: {project.symbol}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Deposit APY</p>
                <p className="font-bold text-green-400">{lendingPairs.pair80.depositAPY}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Borrow APY</p>
                <p className="font-bold text-red-400">{lendingPairs.pair80.borrowAPY}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Deposited</p>
                <p className="font-medium">{lendingPairs.pair80.totalDeposited.toLocaleString()} {project.symbol}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Utilization</p>
                <p className="font-medium">{lendingPairs.pair80.utilizationRate}%</p>
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">Use Case</p>
              <p className="text-xs">Deposit {project.symbol} to earn yield, or borrow {fundingTokenSymbol} against {project.symbol} collateral</p>
            </div>
          </CardContent>
        </Card>

        {/* Pair 20: Funding Token as Asset */}
        <Card className={`border-2 transition-all duration-200 cursor-pointer ${
          selectedPair === 'pair20' 
            ? 'border-primary bg-primary/5' 
            : 'border-border/50 bg-card/95 hover:border-primary/50'
        } backdrop-blur-sm shadow-lg`}
        onClick={() => setSelectedPair('pair20')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>{fundingTokenSymbol} Lending Pool</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Asset: {fundingTokenSymbol}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Deposit APY</p>
                <p className="font-bold text-green-400">{lendingPairs.pair20.depositAPY}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Borrow APY</p>
                <p className="font-bold text-red-400">{lendingPairs.pair20.borrowAPY}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Deposited</p>
                <p className="font-medium">{lendingPairs.pair20.totalDeposited.toLocaleString()} {fundingTokenSymbol}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Utilization</p>
                <p className="font-medium">{lendingPairs.pair20.utilizationRate}%</p>
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">Use Case</p>
              <p className="text-xs">Deposit {fundingTokenSymbol} to earn yield, or borrow {project.symbol} against {fundingTokenSymbol} collateral</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lending Interface */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Prolend Interface</CardTitle>
            </div>
            <Badge variant="outline">
              {currentPair.assetToken.symbol}/{currentPair.collateralToken.symbol} Pool
            </Badge>
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-4 gap-4 p-3 bg-secondary/20 rounded-lg border border-border/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Available Liquidity</p>
              <p className="text-sm font-medium">{currentPair.availableLiquidity.toLocaleString()} {currentPair.assetToken.symbol}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Max LTV</p>
              <p className="text-sm font-medium">{currentPair.maxLTV}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Liquidation Threshold</p>
              <p className="text-sm font-medium">75%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Liquidation Fee</p>
              <p className="text-sm font-medium">10%</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lend">Lend</TabsTrigger>
              <TabsTrigger value="borrow">Borrow</TabsTrigger>
            </TabsList>

            {/* Lending Tab */}
            <TabsContent value="lend" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Deposit {currentPair.assetToken.symbol}
                  </label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg font-mono pr-20"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <Button variant="ghost" size="sm">MAX</Button>
                      <Badge variant="outline">{currentPair.assetToken.symbol}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: 10,000 {currentPair.assetToken.symbol}
                  </p>
                </div>

                {parseFloat(amount) > 0 && (
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <h4 className="font-medium text-sm mb-2">Lending Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposit Amount:</span>
                        <span>{parseFloat(amount).toLocaleString()} {currentPair.assetToken.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">APY:</span>
                        <span className="text-green-400">{currentPair.depositAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Annual Earnings:</span>
                        <span>{(parseFloat(amount) * currentPair.depositAPY / 100).toFixed(2)} {currentPair.assetToken.symbol}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleTransaction}
                  disabled={!amount || parseFloat(amount) <= 0 || isTransacting}
                  className="w-full btn-primary-custom"
                  size="lg"
                >
                  {isTransacting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Depositing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Deposit {currentPair.assetToken.symbol}</span>
                    </div>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Borrowing Tab */}
            <TabsContent value="borrow" className="space-y-6">
              <div className="space-y-4">
                {/* Collateral Input */}
                <div>
                  <label className="text-sm font-medium">
                    Collateral ({currentPair.collateralToken.symbol})
                  </label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={collateralAmount}
                      onChange={(e) => setCollateralAmount(e.target.value)}
                      className="text-lg font-mono pr-20"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <Button variant="ghost" size="sm">MAX</Button>
                      <Badge variant="outline">{currentPair.collateralToken.symbol}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: 5,000 {currentPair.collateralToken.symbol}
                  </p>
                </div>

                {/* Borrow Input */}
                <div>
                  <label className="text-sm font-medium">
                    Borrow {currentPair.assetToken.symbol}
                  </label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg font-mono pr-20"
                      max={maxBorrowAmount}
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAmount(maxBorrowAmount.toFixed(2))}
                      >
                        MAX
                      </Button>
                      <Badge variant="outline">{currentPair.assetToken.symbol}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {maxBorrowAmount.toFixed(2)} {currentPair.assetToken.symbol} (75% LTV)
                  </p>
                </div>

                {/* Borrow Summary */}
                {collateralValue > 0 && borrowAmount > 0 && (
                  <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <h4 className="font-medium text-sm mb-2">Borrow Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Collateral:</span>
                        <span>{collateralValue.toLocaleString()} {currentPair.collateralToken.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Borrow Amount:</span>
                        <span>{borrowAmount.toLocaleString()} {currentPair.assetToken.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LTV Ratio:</span>
                        <span className={`${(borrowAmount / collateralValue * 100) > 65 ? 'text-red-400' : 'text-green-400'}`}>
                          {((borrowAmount / collateralValue) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Borrow APY:</span>
                        <span className="text-red-400">{currentPair.borrowAPY}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Liquidation Price:</span>
                        <span className="text-orange-400">${liquidationPrice.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Warning */}
                {(borrowAmount / collateralValue * 100) > 65 && (
                  <Alert className="border-red-500/20 bg-red-500/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      High LTV ratio! Your position may be liquidated if the collateral value drops.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleTransaction}
                  disabled={!amount || !collateralAmount || parseFloat(amount) <= 0 || parseFloat(collateralAmount) <= 0 || isTransacting || borrowAmount > maxBorrowAmount}
                  className="w-full btn-primary-custom"
                  size="lg"
                >
                  {isTransacting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Borrowing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>Borrow {currentPair.assetToken.symbol}</span>
                    </div>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Leverage Strategy Info */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-primary" />
            <span>Leverage Trading Strategies</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span>Long {project.symbol}</span>
              </h4>
              <p className="text-xs text-muted-foreground mb-2">Strategy for bullish outlook</p>
              <ol className="text-xs space-y-1">
                <li>1. Deposit {project.symbol} as collateral</li>
                <li>2. Borrow {fundingTokenSymbol}</li>
                <li>3. Use borrowed {fundingTokenSymbol} to buy more {project.symbol}</li>
                <li>4. Repeat to increase leverage</li>
              </ol>
            </div>
            
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span>Short {project.symbol}</span>
              </h4>
              <p className="text-xs text-muted-foreground mb-2">Strategy for bearish outlook</p>
              <ol className="text-xs space-y-1">
                <li>1. Deposit {fundingTokenSymbol} as collateral</li>
                <li>2. Borrow {project.symbol}</li>
                <li>3. Sell borrowed {project.symbol} for {fundingTokenSymbol}</li>
                <li>4. Profit if {project.symbol} price drops</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
