import { useState, useCallback } from 'react'

export interface LoadingState<T = unknown> {
  isLoading: boolean
  error: Error | string | null
  data: T | undefined
}

export interface LoadingActions<T = unknown> {
  setLoading: (loading: boolean) => void
  setError: (error: Error | string | null) => void
  setData: (data: T) => void
  reset: () => void
  execute: <U>(asyncFn: () => Promise<U>) => Promise<U | null>
}

export function useLoadingState<T = unknown>(initialData?: T): LoadingState<T> & LoadingActions<T> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | string | null>(null)
  const [data, setData] = useState<T | undefined>(initialData)

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
    if (loading) {
      setError(null) // Clear error when starting new operation
    }
  }, [])

  const handleSetError = useCallback((error: Error | string | null) => {
    setError(error)
    setIsLoading(false) // Stop loading when error occurs
  }, [])

  const handleSetData = useCallback((newData: T) => {
    setData(newData)
    setError(null)
    setIsLoading(false)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(initialData)
  }, [initialData])

  const execute = useCallback(async <U>(asyncFn: () => Promise<U>): Promise<U | null> => {
    try {
      setLoading(true)
      const result = await asyncFn()
      handleSetData(result as unknown as T)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      handleSetError(error)
      return null
    }
  }, [setLoading, handleSetData, handleSetError])

  return {
    isLoading,
    error,
    data,
    setLoading,
    setError: handleSetError,
    setData: handleSetData,
    reset,
    execute
  }
}

// Hook for managing multiple loading states
export function useMultipleLoadingStates() {
  const [states, setStates] = useState<Record<string, LoadingState>>({})

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || { isLoading: false, error: null, data: null }
  }, [states])

  const setState = useCallback((key: string, newState: Partial<LoadingState>) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...getState(key), ...newState }
    }))
  }, [getState])

  const setLoading = useCallback((key: string, loading: boolean) => {
    setState(key, { isLoading: loading, error: loading ? null : getState(key).error })
  }, [setState, getState])

  const setError = useCallback((key: string, error: Error | string | null) => {
    setState(key, { error, isLoading: false })
  }, [setState])

  const setData = useCallback((key: string, data: unknown) => {
    setState(key, { data, error: null, isLoading: false })
  }, [setState])

  const reset = useCallback((key: string) => {
    setState(key, { isLoading: false, error: null, data: null })
  }, [setState])

  const execute = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(key, true)
      const result = await asyncFn()
      setData(key, result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(key, error)
      return null
    }
  }, [setLoading, setData, setError])

  const isAnyLoading = Object.values(states).some(state => state.isLoading)
  const hasAnyError = Object.values(states).some(state => state.error)
  const allErrors = Object.entries(states)
    .filter(([, state]) => state.error)
    .map(([key, state]) => ({ key, error: state.error }))

  return {
    states,
    getState,
    setState,
    setLoading,
    setError,
    setData,
    reset,
    execute,
    isAnyLoading,
    hasAnyError,
    allErrors
  }
}

// Hook for handling form submission states
export function useFormSubmission<T = unknown>() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<Error | string | null>(null)
  const [result, setResult] = useState<T | null>(null)

  const submit = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setIsSubmitting(true)
      setError(null)
      setIsSuccess(false)
      
      const result = await asyncFn()
      
      setResult(result)
      setIsSuccess(true)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setIsSuccess(false)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setIsSuccess(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    isSubmitting,
    isSuccess,
    error,
    result,
    submit,
    reset,
    hasError: !!error
  }
}

// Hook for handling retry logic
export function useRetry(maxRetries = 3, retryDelay = 1000) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const retry = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    if (retryCount >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded`)
    }

    try {
      setIsRetrying(true)
      
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount))
      }
      
      const result = await asyncFn()
      setRetryCount(0) // Reset on success
      return result
    } catch (error) {
      setRetryCount(prev => prev + 1)
      throw error
    } finally {
      setIsRetrying(false)
    }
  }, [retryCount, maxRetries, retryDelay])

  const resetRetry = useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
  }, [])

  const canRetry = retryCount < maxRetries

  return {
    retry,
    retryCount,
    isRetrying,
    canRetry,
    resetRetry,
    maxRetries
  }
}
