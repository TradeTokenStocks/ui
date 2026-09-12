'use client';

import type { LiveHackathonDeployment, LiveSigner } from '@tradetoken/domain';
import { getConnection, sendTransaction, switchChain } from 'wagmi/actions';

import { robinHoodTestnet } from './chains';
import { wagmiConfig } from './wagmi';

/**
 * Bind the connected wagmi wallet (the Privy embedded wallet when signed in)
 * to the deployment chain. The chain must already be in `supportedChains`.
 */
export async function connectLiveSigner(deployment: LiveHackathonDeployment): Promise<LiveSigner> {
  if (deployment.chainId !== robinHoodTestnet.id) {
    throw new Error(`Add chain ${deployment.chainId} to the web wallet configuration.`);
  }
  const connection = getConnection(wagmiConfig);
  const account = connection.address;
  if (!account) throw new Error('Sign in and create your embedded wallet first.');
  if (connection.chainId !== robinHoodTestnet.id) {
    await switchChain(wagmiConfig, { chainId: robinHoodTestnet.id });
  }
  return {
    account,
    send: (transaction) =>
      sendTransaction(wagmiConfig, { ...transaction, account, chainId: robinHoodTestnet.id }),
  };
}
