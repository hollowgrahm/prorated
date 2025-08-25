'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorDisplayProps {
  error: Error | string
  title?: string
  description?: string
  onRetry?: () => void
  onReset?: () => void
  className?: string
  variant?: 'default' | 'destructive' | 'warning'
  showDetails?: boolean
}

export function ErrorDisplay({ 
  error, 
  title = 'Something went wrong',
  description,
  onRetry,
  onReset,
  className,
  variant = 'destructive',
  showDetails = false
}: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'string' ? undefined : error.stack

  const variantClasses = {
    default: 'border-border bg-card',
    destructive: 'border-red-500/50 bg-red-500/10',
    warning: 'border-yellow-500/50 bg-yellow-500/10'
  }

  const iconClasses = {
    default: 'text-muted-foreground',
    destructive: 'text-red-400',
    warning: 'text-yellow-400'
  }

  return (
    <Alert className={cn(variantClasses[variant], className)}>
      <AlertTriangle className={cn('h-4 w-4', iconClasses[variant])} />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">{title}</h4>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            <p className="text-sm mt-2">{errorMessage}</p>
          </div>

          {showDetails && errorStack && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show technical details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {errorStack}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="h-8"
              >
                <Home className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export function PageErrorDisplay({ 
  error, 
  onRetry,
  title = 'Page failed to load',
  description = 'We encountered an error while loading this page. Please try again.'
}: {
  error: Error | string
  onRetry?: () => void
  title?: string
  description?: string
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-500/50 bg-red-500/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <CardTitle className="text-red-400">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          <ErrorDisplay 
            error={error}
            variant="destructive"
            onRetry={onRetry}
            showDetails={process.env.NODE_ENV === 'development'}
          />

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex items-center"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  }>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return <Fallback error={this.state.error} resetError={this.resetError} />
      }

      return (
        <PageErrorDisplay 
          error={this.state.error}
          onRetry={this.resetError}
          title="Application Error"
          description="Something went wrong in the application. Please try refreshing the page."
        />
      )
    }

    return this.props.children
  }
}

// Hook for handling async errors
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    setError(errorObj)
    console.error('Handled error:', errorObj)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError,
    clearError,
    hasError: !!error
  }
}
