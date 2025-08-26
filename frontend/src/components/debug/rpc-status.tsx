'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react'
import { testRpcConnectivity, getCurrentRpcUrls } from '@/lib/network-utils'

interface RpcStatus {
  url: string
  status: 'healthy' | 'error'
  chainId: number | null
  responseTime: number | null
  error: string | null
}

export function RpcStatus() {
  const [rpcStatuses, setRpcStatuses] = useState<RpcStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkRpcStatus = async () => {
    setIsLoading(true)
    try {
      const results = await testRpcConnectivity()
      setRpcStatuses(results)
      setLastChecked(new Date())
    } catch (error) {
      console.error('Failed to check RPC status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkRpcStatus()
  }, [])

  const rpcs = getCurrentRpcUrls()

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">RPC Status</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkRpcStatus}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rpcs.length > 1 && (
          <div className="text-xs text-muted-foreground">
            🔄 Fallback transport enabled with {rpcs.length} endpoints
          </div>
        )}
        
        {rpcStatuses.map((rpc, index) => (
          <div key={rpc.url} className="flex items-center justify-between p-2 rounded-lg border">
            <div className="flex items-center space-x-2">
              {rpc.status === 'healthy' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <div>
                <div className="text-sm font-medium">
                  {index === 0 ? 'Primary' : 'Backup'} RPC
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {rpc.url}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {rpc.responseTime && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{rpc.responseTime}ms</span>
                </div>
              )}
              <Badge variant={rpc.status === 'healthy' ? 'default' : 'destructive'}>
                {rpc.status === 'healthy' ? 'Healthy' : 'Error'}
              </Badge>
            </div>
          </div>
        ))}
        
        {lastChecked && (
          <div className="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
