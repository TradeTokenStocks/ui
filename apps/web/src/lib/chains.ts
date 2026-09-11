import { defineChain } from 'viem';
import { baseSepolia, sepolia } from 'viem/chains';

export const robinHoodTestnet = defineChain({
    id: 46630,
    name: 'RobinHood Chain Testnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.testnet.chain.robinhood.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'RobinHood Explorer',
            url: 'https://explorer.testnet.chain.robinhood.com',
        },
    },
    testnet: true,
});

export const supportedChains = [baseSepolia, sepolia, robinHoodTestnet] as const;
export const defaultChain = baseSepolia;