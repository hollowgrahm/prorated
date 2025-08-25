// Auto-generated contract addresses
// This file is automatically updated by the deployment script
// DO NOT EDIT MANUALLY - changes will be overwritten

export const CONTRACT_ADDRESSES = {
  // Core contracts
  mockUSDC: '0x7Cf4be31f546c04787886358b9486ca3d62B9acf',
  proratedFactory: '0x4eaB29997D332A666c3C366217Ab177cF9A7C436',
  
  // Proswap contracts
  proswapFactory: '0x0c626FC4A447b01554518550e30600136864640B',
  proswapRouter: '0xA21DDc1f17dF41589BC6A5209292AED2dF61Cc94',
  
  // Prolend contracts
  prolendFactory: '0x2A590C461Db46bca129E8dBe5C3998A8fF402e76',
  
  // Deployer contracts
  tokenDeployer: '0x158d291D8b47F056751cfF47d1eEcd19FDF9B6f8',
  pairDeployer: '0x2F54D1563963fC04770E85AF819c89Dc807f6a06',
  liquidityDeployer: '0xF342E904702b1D021F03f519D6D9614916b03f37',
  veNFTDeployer: '0x9849832a1d8274aaeDb1112ad9686413461e7101',
  governorDeployer: '0xa4E00CB342B36eC9fDc4B50b3d527c3643D4C49e',
  treasuryDeployer: '0x8ac5eE52F70AE01dB914bE459D8B3d50126fd6aE',
  prolendDeployer: '0x325c8Df4CFb5B068675AFF8f62aA668D1dEc3C4B',
  
  // Example pools
  activePool: '0xd717922EE2B59C3C9763B76D66AE204E08935B23',
  successfulPool: '0x5f03cEdB9E9b75291253E9DF6d6B0DACFc40BBC2',
  launchedPool: '0x832Ddd6368701613FF247a9b7e5b8cF44cd3A5D1',
} as const

export const NETWORK_CONFIG = {
  chainId: 31337,
  rpcUrl: 'http://localhost:8545',
  name: 'Anvil Local',
} as const

// Deployment metadata
export const DEPLOYMENT_INFO = {
  timestamp: '2025-08-25T04:03:21.302Z',
  deployer: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  blockNumber: 'latest',
} as const