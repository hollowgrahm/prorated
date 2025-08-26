'use client'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Plus, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { NETWORK_CONFIG } from '@/lib/contracts-config'
import { anvilLocal, hyperliquidTestnet } from '@/lib/wagmi'

export function NetworkHelper() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [isAdding, setIsAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(false)

  // Determine the target network based on config
  const targetNetwork = NETWORK_CONFIG.chainId === 998 ? hyperliquidTestnet : anvilLocal
  const isOnCorrectNetwork = chainId === targetNetwork.id

  const addTargetNetwork = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Ethereum wallet')
      return
    }

    setIsAdding(true)
    try {
      // Add the network to MetaMask
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${targetNetwork.id.toString(16)}`, // Convert to hex
            chainName: targetNetwork.name,
            nativeCurrency: targetNetwork.nativeCurrency,
            rpcUrls: [targetNetwork.rpcUrls.default.http[0]],
            blockExplorerUrls: [targetNetwork.blockExplorers?.default.url],
          },
        ],
      })
      setIsAdded(true)
    } catch (error) {
      console.error('Failed to add network:', error)
      alert('Failed to add network. Please add it manually in MetaMask.')
    } finally {
      setIsAdding(false)
    }
  }

  const switchToTargetNetwork = async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetNetwork.id.toString(16)}` }],
      })
    } catch (error) {
      console.error('Failed to switch network:', error)
      // If the network doesn't exist, add it
      await addTargetNetwork()
    }
  }

  if (!isConnected) {
    return (
      <Alert className="border-green-500/20 bg-green-500/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
                      <strong>Demo Setup:</strong> Connect your wallet first, then make sure you&apos;re on the {targetNetwork.name} to interact with the demo contracts.
        </AlertDescription>
      </Alert>
    )
  }

  if (isOnCorrectNetwork) {
    return (
      <Alert className="border-green-500/20 bg-green-500/5">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription className="text-green-400">
          <strong>Ready!</strong> You&apos;re connected to {targetNetwork.name}. You can now interact with the demo contracts.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-yellow-500/20 bg-yellow-500/5">
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <strong>Wrong Network:</strong> Please switch to {targetNetwork.name} to use the demo.
          </div>
          <div className="flex gap-2 ml-4">
            {!isAdded && (
              <Button
                variant="outline"
                size="sm"
                onClick={addTargetNetwork}
                disabled={isAdding}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isAdding ? 'Adding...' : 'Add Network'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={switchToTargetNetwork}
            >
              Switch Network
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}


