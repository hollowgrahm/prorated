/**
 * Utility functions for handling token precision
 * All tokens use 18 decimals as defined in ProratedToken.sol
 */

export const TOKEN_DECIMALS = 18
export const TOKEN_PRECISION = BigInt(10 ** TOKEN_DECIMALS)

/**
 * Converts a user-friendly token amount to the contract's expected format
 * Example: 1,000,000 becomes 1000000000000000000000000 (1M * 10^18)
 */
export function toTokenUnits(humanAmount: number): bigint {
  if (!Number.isFinite(humanAmount) || humanAmount < 0) {
    throw new Error('Invalid token amount')
  }
  
  // Convert to string to avoid floating point precision issues
  const humanStr = humanAmount.toString()
  
  // Handle decimal places if any
  const [whole, decimal = ''] = humanStr.split('.')
  const paddedDecimal = decimal.padEnd(TOKEN_DECIMALS, '0').slice(0, TOKEN_DECIMALS)
  
  const tokenUnits = BigInt(whole + paddedDecimal)
  return tokenUnits
}

/**
 * Converts contract token units back to human-readable format
 * Example: 1000000000000000000000000 becomes 1,000,000
 */
export function fromTokenUnits(tokenUnits: bigint): number {
  const divisor = TOKEN_PRECISION
  const wholePart = Number(tokenUnits / divisor)
  const fractionalPart = Number(tokenUnits % divisor) / Number(divisor)
  
  return wholePart + fractionalPart
}

/**
 * Formats token units for display with proper precision
 */
export function formatTokenAmount(humanAmount: number, decimals: number = 0): string {
  return humanAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Validates that a human amount can be safely converted to token units
 */
export function validateTokenAmount(humanAmount: number): boolean {
  try {
    if (!Number.isFinite(humanAmount) || humanAmount < 0) {
      return false
    }
    
    // Check if the amount would overflow when converted to token units
    const maxSafeAmount = Number.MAX_SAFE_INTEGER / Number(TOKEN_PRECISION)
    return humanAmount <= maxSafeAmount
  } catch {
    return false
  }
}
