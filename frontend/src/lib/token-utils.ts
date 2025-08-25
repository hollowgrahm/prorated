// Token address to symbol mapping for common tokens
const TOKEN_ADDRESSES: Record<string, string> = {
  // Ethereum Mainnet
  '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e': 'USDC',
  '0xa0b86a33e6411c88f7f3a3c4d79f85b8b52e8e': 'USDC', // lowercase
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT', 
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT', // lowercase
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH', // lowercase
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'DAI',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI', // lowercase
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC', // lowercase
  
  // Mock/Test addresses (add more as needed)
  '0x1234567890123456789012345678901234567890': 'MOCK',
  
  // Current demo MockUSDC address
  '0x7Cf4be31f546c04787886358b9486ca3d62B9acf': 'USDC',
  '0x7cf4be31f546c04787886358b9486ca3d62b9acf': 'USDC', // lowercase
}

/**
 * Get token symbol from contract address
 * Falls back to displaying a shortened address if symbol is not found
 */
export function getTokenSymbol(address: string): string {
  // Normalize address to lowercase for lookup
  const normalizedAddress = address.toLowerCase()
  
  // Check if we have this token in our mapping
  const symbol = TOKEN_ADDRESSES[normalizedAddress]
  
  if (symbol) {
    return symbol
  }
  
  // Fallback to shortened address if not found
  if (address.startsWith('0x') && address.length === 42) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
  
  // Last resort fallback
  return 'UNKNOWN'
}

/**
 * Check if an address is a known token
 */
export function isKnownToken(address: string): boolean {
  return TOKEN_ADDRESSES[address.toLowerCase()] !== undefined
}

/**
 * Add or update a token in the registry (useful for dynamic loading)
 */
export function addToken(address: string, symbol: string): void {
  TOKEN_ADDRESSES[address.toLowerCase()] = symbol
}

/**
 * Get all known tokens
 */
export function getAllKnownTokens(): Record<string, string> {
  return { ...TOKEN_ADDRESSES }
}
