'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Droplets, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaucet } from '@/hooks/useFaucet'
import { useUSDCBalance } from '@/hooks/useContracts'
import { cn } from '@/lib/utils'

export function FaucetButton() {
  const { isConnected, address } = useAccount()
  const { claimUSDC, isLoading, isConfirming, error, success, hash } = useFaucet()
  const { data: usdcBalance, isLoading: balanceLoading } = useUSDCBalance(address)
  const [showSuccess, setShowSuccess] = useState(false)

  // Show success state for 3 seconds only after transaction is confirmed
  useEffect(() => {
    if (success && hash) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [success, hash])

  if (!isConnected) {
    return null // Only show when wallet is connected
  }

  const handleClaim = () => {
    claimUSDC()
  }

  // Format USDC balance for display
  const formatBalance = (balance: bigint | undefined, loading: boolean = false) => {
    if (loading) return '...'
    if (!balance) return '0'
    const formatted = Number(balance) / 1e6 // USDC has 6 decimals
    if (formatted >= 1000) {
      return `${(formatted / 1000).toFixed(1)}K`
    }
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={isLoading || isConfirming}
      variant="default"
      size="sm"
      className={cn(
        "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
        "text-white font-medium shadow-lg hover:shadow-xl",
        "transform hover:scale-105 transition-all duration-200",
        "border-0 hover:border-0 px-3 py-2",
        "flex items-center space-x-2",
        showSuccess && "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
        error && "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
        (isLoading || isConfirming) && "opacity-80 cursor-not-allowed transform-none"
      )}
    >
      {isLoading ? (
        <>
          <Droplets className="h-4 w-4 animate-pulse" />
          <span>Signing...</span>
        </>
      ) : isConfirming ? (
        <>
          <Droplets className="h-4 w-4 animate-spin" />
          <span>Confirming...</span>
        </>
      ) : showSuccess ? (
        <>
          <Check className="h-4 w-4" />
          <span>Claimed!</span>
        </>
      ) : error ? (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Try Again</span>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-2">
            <span className="font-semibold">{formatBalance(usdcBalance, balanceLoading)} USDC</span>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center space-x-1">
              <Droplets className="h-3 w-3" />
              <span className="text-xs">Faucet</span>
            </div>
          </div>
        </>
      )}
    </Button>
  )
}
