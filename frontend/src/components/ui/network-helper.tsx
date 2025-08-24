'use client'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Plus, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { anvilLocal } from '@/lib/wagmi'

export function NetworkHelper() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [isAdding, setIsAdding] = useState(false)
  const [isAdded, setIsAdded] = useState(false)

  const isOnCorrectNetwork = chainId === anvilLocal.id

  const addAnvilNetwork = async () => {
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
            chainId: `0x${anvilLocal.id.toString(16)}`, // Convert to hex
            chainName: anvilLocal.name,
            nativeCurrency: anvilLocal.nativeCurrency,
            rpcUrls: [anvilLocal.rpcUrls.default.http[0]],
            blockExplorerUrls: [anvilLocal.blockExplorers?.default.url],
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

  const switchToAnvilNetwork = async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${anvilLocal.id.toString(16)}` }],
      })
    } catch (error) {
      console.error('Failed to switch network:', error)
      // If the network doesn't exist, add it
      await addAnvilNetwork()
    }
  }

  if (!isConnected) {
    return (
      <Alert className="border-blue-500/20 bg-blue-500/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo Setup:</strong> Connect your wallet first, then make sure you're on the Anvil Local network to interact with the demo contracts.
        </AlertDescription>
      </Alert>
    )
  }

  if (isOnCorrectNetwork) {
    return (
      <Alert className="border-green-500/20 bg-green-500/5">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription className="text-green-400">
          <strong>Ready!</strong> You're connected to Anvil Local network. You can now interact with the demo contracts.
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
            <strong>Wrong Network:</strong> Please switch to Anvil Local network to use the demo.
          </div>
          <div className="flex gap-2 ml-4">
            {!isAdded && (
              <Button
                variant="outline"
                size="sm"
                onClick={addAnvilNetwork}
                disabled={isAdding}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isAdding ? 'Adding...' : 'Add Network'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={switchToAnvilNetwork}
            >
              Switch Network
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
    }
  }
}
