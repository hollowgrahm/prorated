'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Vote, Users, CheckCircle, XCircle, AlertCircle, Plus, Eye, Gavel, Trophy, Info, DollarSign, Clock, Download, TrendingDown, Activity, Timer, AlertTriangle } from 'lucide-react'
import { Project } from '@/types/project'
import { VeNFTCreationInterface } from './venft-creation-interface'

interface GovernanceInterfaceProps {
  project: Project
}

interface Proposal {
  id: number
  title: string
  description: string
  proposer: string
  target: string
  state: 'Pending' | 'Active' | 'Defeated' | 'Succeeded' | 'Executed' | 'Canceled'
  forVotes: number
  againstVotes: number
  quorum: number
  startTime: number
  endTime: number
  executed: boolean
  type: 'Treasury' | 'Protocol' | 'Parameter' | 'Upgrade'
}

interface VeNFT {
  tokenId: number
  votingPower: number
  lockAmount: number
  lockEnd: number
  hasVoted: { [proposalId: number]: boolean }
}

// Mock governance data
const getMockGovernanceData = (project: Project) => {
  const now = Date.now() / 1000
  
  const proposals: Proposal[] = [
    {
      id: 1,
      title: 'Increase Development Funding by 50,000 USDC',
      description: 'Proposal to allocate additional funds from the treasury to accelerate development of the cross-chain bridge integration. This will enable seamless token transfers between Ethereum and other supported chains.',
      proposer: '0xdev1...1234',
      target: project.address,
      state: 'Active',
      forVotes: 125000,
      againstVotes: 25000,
      quorum: 100000,
      startTime: now - 86400, // 1 day ago
      endTime: now + 86400 * 4, // 4 days from now
      executed: false,
      type: 'Treasury'
    },
    {
      id: 2,
      title: 'Update Interest Rate Parameters',
      description: 'Adjust the Prolend interest rate model to optimize borrowing costs and lending yields. Proposal includes reducing base rate from 2% to 1.5% and adjusting utilization curve.',
      proposer: '0xdev2...5678',
      target: project.lendingAddress!,
      state: 'Succeeded',
      forVotes: 200000,
      againstVotes: 50000,
      quorum: 100000,
      startTime: now - 86400 * 7, // 7 days ago
      endTime: now - 86400 * 2, // 2 days ago
      executed: false,
      type: 'Parameter'
    },
    {
      id: 3,
      title: 'Protocol Fee Reduction',
      description: 'Reduce trading fees on Proswap from 0.3% to 0.25% to increase competitiveness and trading volume.',
      proposer: '0xdev3...9012',
      target: project.pairAddress,
      state: 'Executed',
      forVotes: 180000,
      againstVotes: 20000,
      quorum: 100000,
      startTime: now - 86400 * 14, // 14 days ago
      endTime: now - 86400 * 9, // 9 days ago
      executed: true,
      type: 'Protocol'
    },
    {
      id: 4,
      title: 'Community Rewards Program',
      description: 'Establish a 6-month rewards program to incentivize active participation in governance and protocol usage.',
      proposer: '0xdev4...3456',
      target: project.address,
      state: 'Defeated',
      forVotes: 75000,
      againstVotes: 150000,
      quorum: 100000,
      startTime: now - 86400 * 10, // 10 days ago
      endTime: now - 86400 * 5, // 5 days ago
      executed: false,
      type: 'Treasury'
    }
  ]

  const userVeNFTs: VeNFT[] = [
    {
      tokenId: 1,
      votingPower: 25000,
      lockAmount: 50000,
      lockEnd: now + 86400 * 365, // 1 year from now (active)
      hasVoted: { 1: false, 2: true, 3: true, 4: true }
    },
    {
      tokenId: 2,
      votingPower: 15000,
      lockAmount: 30000,
      lockEnd: now + 86400 * 180, // 6 months from now (active)
      hasVoted: { 1: false, 2: false, 3: true, 4: false }
    },
    {
      tokenId: 3,
      votingPower: 5000,
      lockAmount: 25000,
      lockEnd: now - 86400 * 30, // Expired 30 days ago
      hasVoted: { 1: false, 2: false, 3: false, 4: true }
    }
  ]

  return {
    proposals,
    userVeNFTs,
    totalVotingPower: 500000,
    quorumThreshold: 125000, // 25% of total supply
    votingDelay: 172800, // 2 days
    votingPeriod: 432000 // 5 days
  }
}

function getProposalStateColor(state: string): string {
  switch (state) {
    case 'Active':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'Succeeded':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'Executed':
      return 'bg-primary/20 text-primary border-primary/30'
    case 'Defeated':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'Pending':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'Canceled':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    default:
      return 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'Treasury':
      return <Trophy className="h-4 w-4" />
    case 'Protocol':
      return <Gavel className="h-4 w-4" />
    case 'Parameter':
      return <AlertCircle className="h-4 w-4" />
    case 'Upgrade':
      return <Plus className="h-4 w-4" />
    default:
      return <Vote className="h-4 w-4" />
  }
}

function formatTimeRemaining(endTime: number): string {
  const now = Date.now() / 1000
  const timeLeft = endTime - now
  
  if (timeLeft <= 0) return 'Ended'
  
  const days = Math.floor(timeLeft / (24 * 60 * 60))
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60))
  
  if (days > 0) return `${days}d ${hours}h left`
  return `${hours}h left`
}

export function GovernanceInterface({ project }: GovernanceInterfaceProps) {
  const [activeTab, setActiveTab] = useState('venft')
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [selectedVeNFT, setSelectedVeNFT] = useState<number | null>(null)
  const [voteSupport, setVoteSupport] = useState<boolean | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [isManagingLock, setIsManagingLock] = useState(false)
  const [showCreateVeNFT, setShowCreateVeNFT] = useState(false)
  const [lockManagementType, setLockManagementType] = useState<'amount' | 'duration' | null>(null)
  const [selectedNFTForManagement, setSelectedNFTForManagement] = useState<number | null>(null)
  const [additionalLockAmount, setAdditionalLockAmount] = useState('')
  const [newLockDuration, setNewLockDuration] = useState<number[]>([208]) // weeks
  const [showLockManagementModal, setShowLockManagementModal] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawType, setWithdrawType] = useState<'decayed' | 'full' | null>(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [selectedWithdrawNFT, setSelectedWithdrawNFT] = useState<number | null>(null)
  const [hoveredWithdrawInfo, setHoveredWithdrawInfo] = useState<number | null>(null)

  const governanceData = getMockGovernanceData(project)
  const { proposals, userVeNFTs, quorumThreshold } = governanceData

  const activeProposals = proposals.filter(p => p.state === 'Active')
  const totalUserVotingPower = userVeNFTs.reduce((sum, nft) => sum + nft.votingPower, 0)

  const handleVote = async () => {
    setIsVoting(true)
    
    // Simulate vote transaction
    setTimeout(() => {
      setIsVoting(false)
      setSelectedProposal(null)
      setVoteSupport(null)
      setSelectedVeNFT(null)
      // In real app: execute vote transaction
    }, 2000)
  }

  const handleVeNFTCreated = (tokenId: number) => {
    // In real app, this would refresh the user's veNFT list
    console.log('New veNFT created with ID:', tokenId)
    setShowCreateVeNFT(false)
    // TODO: Refresh userVeNFTs list from contract
  }

  const handleLockManagement = (type: 'amount' | 'duration', tokenId: number) => {
    setLockManagementType(type)
    setSelectedNFTForManagement(tokenId)
    setShowLockManagementModal(true)
    
    // Reset form values
    setAdditionalLockAmount('')
    if (type === 'duration') {
      const selectedNFT = userVeNFTs.find(nft => nft.tokenId === tokenId)
      const currentWeeks = selectedNFT ? Math.ceil((selectedNFT.lockEnd - Date.now() / 1000) / (7 * 24 * 60 * 60)) : 1
      setNewLockDuration([Math.max(currentWeeks, 1)])
    }
  }

  // Helper function to get selected NFT data safely
  const getSelectedNFT = () => {
    return userVeNFTs.find(nft => nft.tokenId === selectedNFTForManagement)
  }

  const getCurrentWeeks = () => {
    const selectedNFT = getSelectedNFT()
    return selectedNFT ? Math.ceil((selectedNFT.lockEnd - Date.now() / 1000) / (7 * 24 * 60 * 60)) : 1
  }

  // Helper functions for withdraw functionality
  const isLockExpired = (lockEnd: number) => {
    return Date.now() / 1000 > lockEnd
  }

  const getLockDurationInWeeks = (lockAmount: number, votingPower: number) => {
    // Estimate based on voting power decay - this is a simplified calculation
    // In real app, this should come from contract
    return Math.ceil((votingPower / lockAmount) * 208) // approximate weeks based on decay
  }

  const getDecayedAmount = (nft: VeNFT) => {
    // Calculate decayed amount - simplified for demo
    // In real app, this should call the contract's withdrawDecayed preview function
    const timeElapsed = Date.now() / 1000 - (nft.lockEnd - (getLockDurationInWeeks(nft.lockAmount, nft.votingPower) * 7 * 24 * 60 * 60))
    const totalLockTime = getLockDurationInWeeks(nft.lockAmount, nft.votingPower) * 7 * 24 * 60 * 60
    const decayRate = timeElapsed / totalLockTime
    return Math.max(0, nft.lockAmount * decayRate * 0.3) // Up to 30% can be decayed
  }

  const getWithdrawableAmount = (nft: VeNFT) => {
    if (isLockExpired(nft.lockEnd)) {
      return nft.lockAmount // Full amount if expired
    } else {
      return getDecayedAmount(nft) // Only decayed amount if not expired
    }
  }

  // Calculate voting power after withdrawing decayed amount
  const getVotingPowerAfterDecayWithdraw = (nft: VeNFT) => {
    const decayedAmount = getDecayedAmount(nft)
    const remainingAmount = nft.lockAmount - decayedAmount
    const timeRemaining = Math.max(0, nft.lockEnd - Date.now() / 1000)
    const weeksRemaining = timeRemaining / (7 * 24 * 60 * 60)
    // Simplified voting power calculation: amount * time_factor
    return Math.max(0, remainingAmount * (weeksRemaining / 208))
  }

  // Calculate lock duration progress (elapsed weeks vs total weeks)
  const getLockDurationProgress = (nft: VeNFT) => {
    const originalWeeks = getLockDurationInWeeks(nft.lockAmount, nft.votingPower)
    const timeRemaining = Math.max(0, nft.lockEnd - Date.now() / 1000)
    const weeksRemaining = timeRemaining / (7 * 24 * 60 * 60)
    const weeksElapsed = originalWeeks - weeksRemaining
    
    return {
      originalWeeks: Math.round(originalWeeks),
      weeksElapsed: Math.max(0, Math.round(weeksElapsed)),
      weeksRemaining: Math.max(0, Math.round(weeksRemaining)),
      progressPercentage: Math.min(100, (weeksElapsed / originalWeeks) * 100)
    }
  }

  const handleWithdrawClick = (type: 'decayed' | 'full', tokenId: number) => {
    if (type === 'decayed') {
      // Show confirmation modal for decayed withdrawal
      setSelectedWithdrawNFT(tokenId)
      setWithdrawType(type)
      setShowWithdrawConfirm(true)
    } else {
      // Direct withdrawal for full withdrawal
      setSelectedWithdrawNFT(tokenId)
      executeWithdraw(type)
    }
  }

  const executeWithdraw = async (type: 'decayed' | 'full') => {
    setIsWithdrawing(true)
    setWithdrawType(type)
    setShowWithdrawConfirm(false)
    
    // Simulate transaction
    setTimeout(() => {
      setIsWithdrawing(false)
      setWithdrawType(null)
      setSelectedWithdrawNFT(null)
      // In real app: execute withdraw or withdrawDecayed
    }, 2000)
  }

  const executeTransaction = async () => {
    setIsManagingLock(true)
    
    // Simulate transaction
    setTimeout(() => {
      setIsManagingLock(false)
      setShowLockManagementModal(false)
      setLockManagementType(null)
      setSelectedNFTForManagement(null)
      // In real app: execute increaseLockAmount or increaseLockDuration
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Governance Overview */}
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Vote className="h-5 w-5 text-primary" />
            <span>{project.name} DAO Governance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{proposals.length}</p>
              <p className="text-muted-foreground">Total Proposals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{activeProposals.length}</p>
              <p className="text-muted-foreground">Active Votes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{totalUserVotingPower.toLocaleString()}</p>
              <p className="text-muted-foreground">Your Voting Power</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">25%</p>
              <p className="text-muted-foreground">Quorum Required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Governance Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
          <TabsTrigger 
            value="venft" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
          >
            My veNFTs
          </TabsTrigger>
          <TabsTrigger 
            value="proposals" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
          >
            Proposals
          </TabsTrigger>
          <TabsTrigger 
            value="vote" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
          >
            Vote
          </TabsTrigger>
          <TabsTrigger 
            value="create" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
          >
            Create Proposal
          </TabsTrigger>
        </TabsList>

        <div className="relative min-h-[400px]">

          {/* My veNFTs Tab */}
          <TabsContent 
            value="venft" 
            className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
          >
            {/* Create New veNFT Button */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Your veNFT Positions</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your locked LP tokens and voting power
                </p>
              </div>
              <Button 
                className="btn-primary-custom"
                onClick={() => setShowCreateVeNFT(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New veNFT
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userVeNFTs.map((nft) => (
                <Card key={nft.tokenId} className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span>veNFT #{nft.tokenId}</span>
                        {isLockExpired(nft.lockEnd) && (
                          <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-primary">
                        {nft.votingPower.toLocaleString()} power
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Locked Amount</p>
                        <p className="font-medium">{nft.lockAmount.toLocaleString()} {project.symbol}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lock Duration</p>
                        <p className="font-medium">
                          {getLockDurationInWeeks(nft.lockAmount, nft.votingPower)} weeks
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Lock Expires</p>
                        <p className={`font-medium ${isLockExpired(nft.lockEnd) ? 'text-green-400' : 'text-foreground'}`}>
                          {new Date(nft.lockEnd * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <p className="text-muted-foreground">Withdrawable</p>
                          {!isLockExpired(nft.lockEnd) && getDecayedAmount(nft) > 0 && (
                            <div className="relative">
                              <Info 
                                className="h-3 w-3 text-muted-foreground cursor-help" 
                                onMouseEnter={() => setHoveredWithdrawInfo(nft.tokenId)}
                                onMouseLeave={() => setHoveredWithdrawInfo(null)}
                              />

                            </div>
                          )}
                        </div>
                        <p className="font-medium text-green-400">
                          {getWithdrawableAmount(nft).toFixed(2)} {project.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isLockExpired(nft.lockEnd) ? 'Full amount' : 'Decayed portion'}
                        </p>
                      </div>
                    </div>

                    {/* Withdraw Impact Card */}
                    {!isLockExpired(nft.lockEnd) && getDecayedAmount(nft) > 0 && hoveredWithdrawInfo === nft.tokenId && (
                      <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <h4 className="font-medium text-sm mb-2 flex items-center">
                          <Info className="h-3 w-3 mr-1" />
                          Withdraw Impact
                        </h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Voting Power:</span>
                            <span>{nft.votingPower.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">After Withdraw:</span>
                            <span className="text-orange-400">~{getVotingPowerAfterDecayWithdraw(nft).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Power Reduction:</span>
                            <span className="text-red-400">
                              -{(nft.votingPower - getVotingPowerAfterDecayWithdraw(nft)).toFixed(0)} 
                              ({(((nft.votingPower - getVotingPowerAfterDecayWithdraw(nft)) / nft.votingPower) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lock Duration Progress */}
                    {!isLockExpired(nft.lockEnd) && (
                      <div>
                        {(() => {
                          const progress = getLockDurationProgress(nft)
                          return (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-muted-foreground flex items-center">
                                  <Timer className="h-3 w-3 mr-1" />
                                  Lock Duration
                                </span>
                                <span className="text-xs font-medium">
                                  {progress.weeksElapsed} / {progress.originalWeeks} weeks
                                </span>
                              </div>
                              <Progress 
                                value={progress.progressPercentage} 
                                className="h-2"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Started</span>
                                <span>{progress.weeksRemaining} weeks remaining</span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Voting History</p>
                      <div className="space-y-1 text-xs">
                        {Object.entries(nft.hasVoted).map(([proposalId, voted]) => (
                          <div key={proposalId} className="flex justify-between">
                            <span>Proposal #{proposalId}</span>
                            <span className={voted ? 'text-green-400' : 'text-muted-foreground'}>
                              {voted ? 'Voted' : 'Not Voted'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Lock Management Buttons */}
                      {!isLockExpired(nft.lockEnd) && (
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 btn-outline-custom"
                            onClick={() => handleLockManagement('amount', nft.tokenId)}
                            disabled={isManagingLock && lockManagementType === 'amount'}
                          >
                            {isManagingLock && lockManagementType === 'amount' ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">Increasing...</span>
                              </div>
                            ) : (
                              <>
                                <DollarSign className="h-3 w-3 mr-1" />
                                Increase Amount
                              </>
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 btn-outline-custom"
                            onClick={() => handleLockManagement('duration', nft.tokenId)}
                            disabled={isManagingLock && lockManagementType === 'duration'}
                          >
                            {isManagingLock && lockManagementType === 'duration' ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">Extending...</span>
                              </div>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Extend Duration
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Withdraw Buttons */}
                      <div className="flex space-x-2">
                        {isLockExpired(nft.lockEnd) ? (
                          // Full withdrawal when expired
                          <Button 
                            size="sm" 
                            className="flex-1 btn-primary-custom"
                            onClick={() => handleWithdrawClick('full', nft.tokenId)}
                            disabled={isWithdrawing && withdrawType === 'full'}
                          >
                            {isWithdrawing && withdrawType === 'full' ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">Withdrawing...</span>
                              </div>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                Withdraw All ({nft.lockAmount.toLocaleString()})
                              </>
                            )}
                          </Button>
                        ) : (
                          // Decayed withdrawal when not expired
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 btn-outline-custom"
                            onClick={() => handleWithdrawClick('decayed', nft.tokenId)}
                            disabled={isWithdrawing && withdrawType === 'decayed' || getWithdrawableAmount(nft) === 0}
                          >
                            {isWithdrawing && withdrawType === 'decayed' ? (
                              <div className="flex items-center space-x-1">
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs">Withdrawing...</span>
                              </div>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                Withdraw Decayed ({getWithdrawableAmount(nft).toFixed(2)})
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {userVeNFTs.length === 0 && (
              <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No veNFTs Found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Lock {project.symbol} tokens to create veNFTs and participate in governance
                  </p>
                  <Button 
                    className="btn-primary-custom"
                    onClick={() => setShowCreateVeNFT(true)}
                  >
                    Create veNFT
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* veNFT Management Information */}
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm">📝 veNFT Management Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <h4 className="font-medium text-sm mb-2">Available Actions</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• <strong>Increase Lock Amount:</strong> Add more tokens to existing lock (boosts voting power)</li>
                    <li>• <strong>Extend Lock Duration:</strong> Increase lock time up to 208 weeks (4 years)</li>
                    <li>• <strong>Withdraw Decayed:</strong> Claim tokens that have naturally decayed over time</li>
                    <li>• <strong>Full Withdrawal:</strong> Claim all tokens after lock expires (burns NFT)</li>
                  </ul>
                </div>

                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <h4 className="font-medium text-sm mb-2">🧮 Voting Power Formula</h4>
                  <div className="text-xs space-y-2 text-muted-foreground">
                    <div className="font-mono text-center p-2 bg-green-500/20 rounded">
                      voting_power = locked_amount × (time_remaining / max_time)
                    </div>
                    <ul className="space-y-1">
                      <li>• <strong>Linear Decay:</strong> Voting power decreases as time approaches expiration</li>
                      <li>• <strong>Token Decay:</strong> Some tokens naturally become withdrawable over time</li>
                      <li>• <strong>Impact:</strong> Withdrawing decayed tokens reduces both amount and voting power</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <h4 className="font-medium text-sm mb-2">📊 Visual Indicators</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• <strong>Lock Duration:</strong> Progress bar showing elapsed weeks vs total lock duration</li>
                    <li>• <strong>Info Icons:</strong> Hover over info symbols for withdrawal impact details</li>
                    <li>• <strong>Confirmation Modals:</strong> Warning dialogs before decayed token withdrawal</li>
                    <li>• <strong>Expired Status:</strong> Green highlighting and badges for expired locks</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <h4 className="font-medium text-sm mb-2">⚠️ Important Limitations</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• <strong>No Split/Merge:</strong> veNFTs cannot be split or merged - each is a standalone position</li>
                    <li>• <strong>Lock Duration:</strong> Can only be extended, never decreased</li>
                    <li>• <strong>Amount Increases:</strong> Additional tokens are locked for remaining duration</li>
                    <li>• <strong>Max Lock:</strong> 208 weeks (4 years) maximum lock duration</li>
                    <li>• <strong>Irreversible:</strong> Withdrawing decayed tokens permanently reduces voting power</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        {/* Proposals Tab */}
        <TabsContent 
          value="proposals" 
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
        >
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <Card key={proposal.id} className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium">{proposal.title}</h3>
                        <Badge variant="outline" className={`text-xs ${getProposalStateColor(proposal.state)}`}>
                          {proposal.state}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getTypeIcon(proposal.type)}
                          <span className="ml-1">{proposal.type}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Proposed by {proposal.proposer}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      {proposal.state === 'Active' && (
                        <p className="text-orange-400">{formatTimeRemaining(proposal.endTime)}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground">{proposal.description}</p>
                  
                  {/* Voting Results */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Voting Progress</span>
                      <span className="text-muted-foreground">
                        {((proposal.forVotes + proposal.againstVotes) / quorumThreshold * 100).toFixed(1)}% of quorum
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm">For</span>
                        </div>
                        <span className="text-sm font-medium">{proposal.forVotes.toLocaleString()} votes</span>
                      </div>
                      <Progress value={(proposal.forVotes / (proposal.forVotes + proposal.againstVotes)) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-400" />
                          <span className="text-sm">Against</span>
                        </div>
                        <span className="text-sm font-medium">{proposal.againstVotes.toLocaleString()} votes</span>
                      </div>
                      <Progress value={(proposal.againstVotes / (proposal.forVotes + proposal.againstVotes)) * 100} className="h-2 bg-red-500/20" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedProposal(proposal)}
                      className="btn-outline-custom"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {proposal.state === 'Active' && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedProposal(proposal)
                          setActiveTab('vote')
                        }}
                        className="btn-primary-custom"
                      >
                        <Vote className="h-4 w-4 mr-1" />
                        Vote
                      </Button>
                    )}
                    {proposal.state === 'Succeeded' && !proposal.executed && (
                      <Button size="sm" className="btn-primary-custom">
                        <Gavel className="h-4 w-4 mr-1" />
                        Execute
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Vote Tab */}
        <TabsContent 
          value="vote" 
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
        >
          {selectedProposal && selectedProposal.state === 'Active' ? (
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle>Vote on Proposal #{selectedProposal.id}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedProposal.title}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-secondary/20 rounded-lg border border-border/30">
                  <p className="text-sm">{selectedProposal.description}</p>
                </div>

                {/* veNFT Selection */}
                <div>
                  <label className="text-sm font-medium">Select veNFT to Vote With</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {userVeNFTs.map((nft) => {
                      const hasVoted = nft.hasVoted[selectedProposal.id]
                      return (
                        <div
                          key={nft.tokenId}
                          onClick={() => !hasVoted && setSelectedVeNFT(nft.tokenId)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            hasVoted 
                              ? 'border-gray-500/50 bg-gray-500/10 opacity-50 cursor-not-allowed'
                              : selectedVeNFT === nft.tokenId
                              ? 'border-primary bg-primary/10'
                              : 'border-border/50 bg-secondary/20 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">veNFT #{nft.tokenId}</p>
                              <p className="text-xs text-muted-foreground">
                                {nft.votingPower.toLocaleString()} voting power
                              </p>
                            </div>
                            {hasVoted && (
                              <Badge variant="outline" className="text-xs">
                                Voted
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Vote Choice */}
                {selectedVeNFT && (
                  <div>
                    <label className="text-sm font-medium">Your Vote</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <Button
                        variant={voteSupport === true ? "default" : "outline"}
                        onClick={() => setVoteSupport(true)}
                        className={voteSupport === true ? "btn-primary-custom" : "btn-outline-custom"}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Vote For
                      </Button>
                      <Button
                        variant={voteSupport === false ? "default" : "outline"}
                        onClick={() => setVoteSupport(false)}
                        className={voteSupport === false ? "btn-primary-custom" : "btn-outline-custom"}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Vote Against
                      </Button>
                    </div>
                  </div>
                )}

                {/* Submit Vote */}
                {selectedVeNFT && voteSupport !== null && (
                  <Button
                    onClick={handleVote}
                    disabled={isVoting}
                    className="w-full btn-primary-custom"
                    size="lg"
                  >
                    {isVoting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Vote...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Vote className="h-4 w-4" />
                        <span>Submit Vote</span>
                      </div>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
              <CardContent className="py-12 text-center">
                <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No active proposal selected</p>
                <p className="text-sm text-muted-foreground">
                  Select an active proposal from the Proposals tab to vote
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Create Proposal Tab */}
        <TabsContent 
          value="create" 
          className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500"
        >
          <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle>Create New Proposal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Propose changes to the protocol (only approved target contracts allowed)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-blue-500/20 bg-blue-500/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Proposal Requirements:</strong> 2-day voting delay, 5-day voting period, 25% quorum required.
                  Only approved target contracts can be called through governance.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Proposal Title</label>
                  <Input
                    placeholder="Brief description of the proposal"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Target Contract</label>
                  <select className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm">
                    <option value="">Select target contract...</option>
                    <option value={project.address}>Project Treasury</option>
                    <option value={project.pairAddress}>Trading Pool</option>
                    <option value={project.lendingAddress}>Lending Pool</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only pre-approved contracts can be targeted by governance proposals
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Function Call</label>
                  <Input
                    placeholder="Function signature (e.g., transferTreasuryFunds(address,uint256,string))"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the function signature to call on the target contract
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Parameters</label>
                  <Input
                    placeholder="ABI-encoded parameters (e.g., 0x123...)"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encoded function parameters (use a tool like abi.encodePacked)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Detailed Description</label>
                  <textarea
                    placeholder="Provide a detailed explanation of the proposal, its rationale, and expected impact..."
                    className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md text-sm min-h-[100px] resize-y"
                  />
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <h4 className="font-medium text-sm mb-2">⚠️ Important</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Proposals cannot be modified after creation</li>
                  <li>• Voting starts after a 2-day delay</li>
                  <li>• 25% of total veNFT power must participate for quorum</li>
                  <li>• Only approved target contracts can be called</li>
                  <li>• Failed proposals cannot be re-executed</li>
                </ul>
              </div>

              <Button
                className="w-full btn-primary-custom"
                size="lg"
                disabled
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Proposal (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        </div>
      </Tabs>

      {/* Lock Management Modal */}
      {showLockManagementModal && selectedNFTForManagement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {lockManagementType === 'amount' ? (
                  <>
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span>Increase Lock Amount</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Extend Lock Duration</span>
                  </>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                veNFT #{selectedNFTForManagement}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {lockManagementType === 'amount' ? (
                // Increase Amount Interface
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Additional Amount to Lock</label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={additionalLockAmount}
                        onChange={(e) => setAdditionalLockAmount(e.target.value)}
                        className="text-lg font-mono pr-20"
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setAdditionalLockAmount('1000')}
                        >
                          MAX
                        </Button>
                        <Badge variant="outline">{project.symbol}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: 1,000 {project.symbol}
                    </p>
                  </div>

                  {parseFloat(additionalLockAmount) > 0 && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <h4 className="font-medium text-sm mb-2">Transaction Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Additional Amount:</span>
                          <span>{parseFloat(additionalLockAmount).toLocaleString()} {project.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lock Expires:</span>
                          <span>
                            {Math.floor(((getSelectedNFT()?.lockEnd || 0) - Date.now() / 1000) / 86400)} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Voting Power:</span>
                          <span className="text-green-400">
                            ~{((getSelectedNFT()?.votingPower || 0) + parseFloat(additionalLockAmount) * 0.5).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Extend Duration Interface
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">New Lock Duration</label>
                    <div className="mt-3 space-y-2">
                      <Slider
                        value={newLockDuration}
                        onValueChange={setNewLockDuration}
                        min={getCurrentWeeks()}
                        max={208}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: {getCurrentWeeks()} weeks</span>
                        <span>Max: 208 weeks</span>
                      </div>
                      <div className="text-center">
                        <Badge variant="outline">
                          {newLockDuration[0]} weeks ({(newLockDuration[0] / 52).toFixed(1)} years)
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Extending your lock increases voting power and rewards
                    </p>
                  </div>

                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <h4 className="font-medium text-sm mb-2">Transaction Summary</h4>
                                          <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Duration:</span>
                          <span>{getCurrentWeeks()} weeks</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Duration:</span>
                          <span className="text-green-400">{newLockDuration[0]} weeks</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Additional Time:</span>
                          <span>+{newLockDuration[0] - getCurrentWeeks()} weeks</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Voting Power Boost:</span>
                          <span className="text-green-400">
                            ~{((getSelectedNFT()?.votingPower || 0) * (newLockDuration[0] / getCurrentWeeks())).toLocaleString()}
                          </span>
                        </div>
                      </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowLockManagementModal(false)}
                  className="flex-1 btn-outline-custom"
                  disabled={isManagingLock}
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeTransaction}
                  disabled={
                    isManagingLock || 
                    (lockManagementType === 'amount' && (!additionalLockAmount || parseFloat(additionalLockAmount) <= 0)) ||
                    (lockManagementType === 'duration' && newLockDuration[0] <= getCurrentWeeks())
                  }
                  className="flex-1 btn-primary-custom"
                >
                  {isManagingLock ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      {lockManagementType === 'amount' ? 'Increase Amount' : 'Extend Duration'}
                    </>
                  )}
                </Button>
              </div>

              <Alert className="border-yellow-500/20 bg-yellow-500/5">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Important:</strong> {lockManagementType === 'amount' 
                    ? 'Additional tokens will be locked for the remaining duration. This cannot be undone.' 
                    : 'Extending lock duration cannot be reversed. Lock duration can only be increased, never decreased.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirm && selectedWithdrawNFT && withdrawType === 'decayed' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                <span>Confirm Withdrawal</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                veNFT #{selectedWithdrawNFT}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const selectedNFT = userVeNFTs.find(nft => nft.tokenId === selectedWithdrawNFT)
                if (!selectedNFT) return null
                
                return (
                  <>
                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <h4 className="font-medium text-sm mb-3 flex items-center">
                        <TrendingDown className="h-4 w-4 mr-1" />
                        Voting Power Impact
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Withdrawing:</span>
                          <span>{getWithdrawableAmount(selectedNFT).toFixed(2)} {project.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Voting Power:</span>
                          <span>{selectedNFT.votingPower.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Voting Power:</span>
                          <span className="text-orange-400">~{getVotingPowerAfterDecayWithdraw(selectedNFT).toFixed(0)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                          <span className="text-muted-foreground">Power Reduction:</span>
                          <span className="text-red-400">
                            -{(selectedNFT.votingPower - getVotingPowerAfterDecayWithdraw(selectedNFT)).toFixed(0)} 
                            ({(((selectedNFT.votingPower - getVotingPowerAfterDecayWithdraw(selectedNFT)) / selectedNFT.votingPower) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    <Alert className="border-red-500/20 bg-red-500/5">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Warning:</strong> This action cannot be undone. Withdrawing decayed tokens will permanently reduce your voting power and governance influence.
                      </AlertDescription>
                    </Alert>

                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-xs text-muted-foreground">
                        <strong>How it works:</strong> Voting power = locked_amount × time_remaining. 
                        Withdrawing decayed tokens reduces both your locked amount and voting power proportionally.
                      </p>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowWithdrawConfirm(false)}
                        className="flex-1 btn-outline-custom"
                        disabled={isWithdrawing}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => executeWithdraw('decayed')}
                        disabled={isWithdrawing}
                        className="flex-1 btn-primary-custom"
                      >
                        {isWithdrawing ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Withdrawing...</span>
                          </div>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Confirm Withdrawal
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* veNFT Creation Modal */}
      {showCreateVeNFT && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <VeNFTCreationInterface
              project={project}
              onClose={() => setShowCreateVeNFT(false)}
              onSuccess={handleVeNFTCreated}
            />
          </div>
        </div>
      )}
    </div>
  )
}
