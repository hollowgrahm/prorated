import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, format } from "date-fns"
import { PoolData, PoolStatus } from "@/types"
import { POOL_STATUS_CONFIG, TIME_CONSTANTS } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format large numbers with K, M, B suffixes
export function formatNumber(num: number | bigint): string {
  const n = typeof num === 'bigint' ? Number(num) : num
  
  if (n >= 1e9) {
    return (n / 1e9).toFixed(1) + 'B'
  }
  if (n >= 1e6) {
    return (n / 1e6).toFixed(1) + 'M'
  }
  if (n >= 1e3) {
    return (n / 1e3).toFixed(1) + 'K'
  }
  return n.toString()
}

// Format token amounts with proper decimals
export function formatTokenAmount(
  amount: bigint, 
  decimals: number = 18, 
  displayDecimals: number = 4
): string {
  const divisor = BigInt(10 ** decimals)
  const quotient = amount / divisor
  const remainder = amount % divisor
  
  if (remainder === BigInt(0)) {
    return quotient.toString()
  }
  
  const decimalPart = remainder.toString().padStart(decimals, '0')
  const trimmedDecimals = decimalPart.slice(0, displayDecimals).replace(/0+$/, '')
  
  if (trimmedDecimals === '') {
    return quotient.toString()
  }
  
  return `${quotient.toString()}.${trimmedDecimals}`
}

// Format USD amounts (USDC has 6 decimals)
export function formatUSD(amount: bigint, showSymbol: boolean = true): string {
  const formatted = formatTokenAmount(amount, 6, 2)
  return showSymbol ? `$${formatted}` : formatted
}

// Format time remaining or elapsed
export function formatTimeRemaining(endTime: number): string {
  const now = Date.now() / 1000
  const timeLeft = endTime - now
  
  if (timeLeft <= 0) {
    return 'Ended'
  }
  
  const days = Math.floor(timeLeft / (24 * 60 * 60))
  const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

// Format relative time (e.g., "2 hours ago", "in 3 days")
export function formatRelativeTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true })
}

// Format absolute time
export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm')
}

// Calculate progress percentage
export function calculateProgress(current: bigint, target: bigint): number {
  if (target === BigInt(0)) return 0
  const percentage = (Number(current) / Number(target)) * 100
  return Math.min(percentage, 100)
}

// Determine pool status
export function getPoolStatus(pool: PoolData): PoolStatus {
  const now = Date.now() / 1000
  
  // Check timing first
  if (now < pool.config.startTime) {
    return 'upcoming'
  }
  
  if (now <= pool.config.endTime) {
    return 'active'
  }
  
  // Pool has ended
  if (pool.totalContributions < pool.minTotalContributions) {
    return 'failed'
  }
  
  // Pool was successful - check deployment status
  const isFullyDeployed = 
    pool.proratedGovernor !== '0x0' && 
    pool.prolendPair80 !== '0x0'
  
  if (isFullyDeployed) {
    return 'launched'
  }
  
  const hasTokenDeployed = pool.proratedToken !== '0x0'
  if (hasTokenDeployed) {
    return 'deploying'
  }
  
  return 'success-pending'
}

// Get status configuration
export function getStatusConfig(status: PoolStatus) {
  return POOL_STATUS_CONFIG[status]
}

// Truncate address for display
export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= 2 + chars * 2) return address
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Calculate lock multiplier (same as weeks for our protocol)
export function calculateLockMultiplier(weeks: number): number {
  return weeks // 1:1 ratio in our protocol
}

// Convert weeks to milliseconds
export function weeksToMs(weeks: number): number {
  return weeks * TIME_CONSTANTS.WEEK
}

// Parse and validate contribution amount
export function parseContributionAmount(
  input: string, 
  decimals: number = 6
): { amount: bigint; isValid: boolean; error?: string } {
  try {
    if (!input || input.trim() === '') {
      return { amount: BigInt(0), isValid: false, error: 'Amount is required' }
    }
    
    const cleanInput = input.replace(/,/g, '')
    const num = parseFloat(cleanInput)
    
    if (isNaN(num) || num <= 0) {
      return { amount: BigInt(0), isValid: false, error: 'Invalid amount' }
    }
    
    // Convert to BigInt with proper decimals
    const amount = BigInt(Math.floor(num * 10 ** decimals))
    
    return { amount, isValid: true }
  } catch (error) {
    return { amount: BigInt(0), isValid: false, error: 'Invalid amount format' }
  }
}

// Copy to clipboard utility
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return true
  }
}

// Sleep utility for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}