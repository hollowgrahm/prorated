// Auto-generated contract addresses
// This file is automatically updated by the deployment script
// DO NOT EDIT MANUALLY - changes will be overwritten
// Network: Hyperliquid Testnet

export const CONTRACT_ADDRESSES = {
  // Core contracts
  mockUSDC: '0xfbdd398f7e8016d82cc96c5d2cec1d1234a3da0a',
  proratedFactory: '0x2d8b7a61913b2e0745b6f5206a8a4c601a4fb2a9',
  
  // Proswap contracts
  proswapFactory: '0x96c684a39e559306f3c4672f5385a6a86431dbe8',
  proswapRouter: '0x9f36aed9417a82d30151adecf5231b37ca7f01d3',
  
  // Prolend contracts
  prolendFactory: '0x877777a2d9a71e415bee13bb2aab14f5bc81be77',
  
  // Deployer contracts
  tokenDeployer: '0x438d87174d86b2d6d5d44969b7394e5dfe100456',
  pairDeployer: '0x2edb2cc433a98a42d9319467623c073296265b84',
  liquidityDeployer: '0xe212f5d0a02123212af16604c62a849ad57f8886',
  veNFTDeployer: '0x143f9a4c60a57fde72ffe6ead4dc7c71ff859c3c',
  governorDeployer: '0x525f305559688d95b1da01b932d439eeddec4db9',
  treasuryDeployer: '0xa31bca3b74a6e22351fed64ea88b069d5edffcb4',
  prolendDeployer: '0x7ad39cffeca1687900f46678bda892fce1abb173',
  
  // Example pools
  activePool: '0x4a264574ee07cb389d4e72370eb9f74d4cfb1856',
  successfulPool: '0xdb6a142d27f7b896ad6f1bb6d2d36aae37717665',
  launchedPool: '0xd24c5fa05aaebba9c6c6ef0274a71bbdaeb51cfc',
  failedPool: '0x2f37937a9013ab1df378953eb6419413ada6a478',
} as const

export const NETWORK_CONFIG = {
  chainId: 998,
  rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
  name: 'Hyperliquid Testnet',
} as const

// Deployment metadata
export const DEPLOYMENT_INFO = {
  timestamp: '2025-08-27T09:47:01.807Z',
  deployer: 'Your Hyperliquid Wallet',
  network: 'hyperliquid',
  blockNumber: 'latest',
} as const