'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, Theme, darkTheme } from '@rainbow-me/rainbowkit'
import { config, anvilLocal } from './wagmi'
import '@rainbow-me/rainbowkit/styles.css'

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Custom RainbowKit theme matching our purple/blue design
const proratedTheme: Theme = {
  ...darkTheme({
    accentColor: 'oklch(0.7 0.18 290)', // Purple primary
    accentColorForeground: 'white',
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
  colors: {
    ...darkTheme().colors,
    accentColor: 'oklch(0.7 0.18 290)', // Purple primary
    accentColorForeground: 'white',
    actionButtonBorder: 'oklch(0.3 0.02 290)',
    actionButtonBorderMobile: 'oklch(0.3 0.02 290)',
    actionButtonSecondaryBackground: 'oklch(0.2 0.02 290)',
    closeButton: 'oklch(0.6 0.1 290)',
    closeButtonBackground: 'oklch(0.2 0.02 290)',
    connectButtonBackground: 'oklch(0.15 0.02 290)',
    connectButtonBackgroundError: 'oklch(0.6 0.2 10)',
    connectButtonInnerBackground: 'oklch(0.18 0.02 290)',
    connectButtonText: 'white',
    connectButtonTextError: 'white',
    connectionIndicator: 'oklch(0.75 0.25 210)', // Electric blue accent
    downloadBottomCardBackground: 'oklch(0.12 0.02 290)',
    downloadTopCardBackground: 'oklch(0.15 0.02 290)',
    error: 'oklch(0.6 0.2 10)',
    generalBorder: 'oklch(0.3 0.02 290)',
    generalBorderDim: 'oklch(0.25 0.02 290)',
    menuItemBackground: 'oklch(0.2 0.02 290)',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    modalBackground: 'oklch(0.12 0.02 290)',
    modalBorder: 'oklch(0.3 0.02 290)',
    modalText: 'white',
    modalTextDim: 'oklch(0.7 0.05 290)',
    modalTextSecondary: 'oklch(0.6 0.1 290)',
    profileAction: 'oklch(0.15 0.02 290)',
    profileActionHover: 'oklch(0.2 0.02 290)',
    profileForeground: 'oklch(0.18 0.02 290)',
    selectedOptionBorder: 'oklch(0.7 0.18 290)', // Purple primary
    standby: 'oklch(0.75 0.25 210)', // Electric blue accent
  },
  shadows: {
    ...darkTheme().shadows,
    connectButton: '0 4px 12px rgba(0, 0, 0, 0.15)',
    dialog: '0 8px 32px rgba(0, 0, 0, 0.4)',
    profileDetailsAction: '0 2px 6px rgba(0, 0, 0, 0.1)',
    selectedOption: '0 2px 6px oklch(0.7 0.18 290 / 0.3)',
    selectedWallet: '0 2px 6px rgba(0, 0, 0, 0.15)',
    walletLogo: '0 2px 16px rgba(0, 0, 0, 0.2)',
  },
}

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={proratedTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
