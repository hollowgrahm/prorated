'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Wallet, Network, Coins } from 'lucide-react'

export function DemoInstructions() {
  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Info className="h-5 w-5 text-primary" />
          <span>Demo Setup Instructions</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert className="border-green-500/20 bg-green-500/5">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Welcome to the Prorated Protocol Demo!</strong> Follow these steps to get started:
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">1</span>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Connect Your Wallet</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Click "Connect Wallet" in the top right and connect your MetaMask or other Ethereum wallet.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">2</span>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Network className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Add Anvil Local Network</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Use the "Add Network" button above to automatically add the local Anvil network to your wallet.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">3</span>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Coins className="h-4 w-4 text-primary" />
                <h4 className="font-medium">Get Demo USDC</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Click the "Get 10K USDC" button in the header or on pool pages to mint demo USDC for testing.
              </p>
            </div>
          </div>
        </div>

        <Alert className="border-green-500/20 bg-green-500/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-green-400">
            <strong>Ready to go!</strong> Once set up, you can contribute to active pools, test the approval flow, and see real-time updates.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
