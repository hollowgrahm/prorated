'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Droplets, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaucet } from '@/hooks/useFaucet'
import { cn } from '@/lib/utils'

export function FaucetButton() {
  const { isConnected } = useAccount()
  const { claimUSDC, isLoading, error, success } = useFaucet()
  const [showSuccess, setShowSuccess] = useState(false)

  // Show success state for 3 seconds
  useEffect(() => {
    if (success) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  if (!isConnected) {
    return null // Only show when wallet is connected
  }

  const handleClaim = () => {
    claimUSDC()
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={isLoading}
      variant="default"
      size="sm"
      className={cn(
        "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700",
        "text-white font-medium shadow-lg hover:shadow-xl",
        "transform hover:scale-105 transition-all duration-200",
        "border-0 hover:border-0",
        showSuccess && "from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
        error && "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700",
        isLoading && "opacity-80 cursor-not-allowed transform-none"
      )}
    >
      {isLoading ? (
        <>
          <Droplets className="mr-2 h-4 w-4 animate-pulse" />
          Claiming...
        </>
      ) : showSuccess ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Claimed!
        </>
      ) : error ? (
        <>
          <AlertCircle className="mr-2 h-4 w-4" />
          Try Again
        </>
      ) : (
        <>
          <Droplets className="mr-2 h-4 w-4" />
          USDC Faucet
        </>
      )}
    </Button>
  )
}
