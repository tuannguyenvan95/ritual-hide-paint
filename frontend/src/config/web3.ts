import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected } from 'wagmi/connectors'

export const ritualTestnet = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  network: 'ritual-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ritual',
    symbol: 'RITUAL',
  },
  rpcUrls: {
    default: { http: ['https://rpc.ritualfoundation.org'] },
    public: { http: ['https://rpc.ritualfoundation.org'] },
  },
  blockExplorers: {
    default: { name: 'Ritual Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
})

export const config = createConfig({
  chains: [ritualTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [ritualTestnet.id]: http(),
  },
})
