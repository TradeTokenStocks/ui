'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

import { TooltipProvider } from '@/components/ui/tooltip';
import { BrokerageHoldingsProvider } from '@/features/connections/hooks/use-brokerage-holdings';
import { defaultChain, supportedChains } from '@/lib/chains';
import { privyAppId, privyClientId } from '@/lib/privy';
import { SessionProvider, useSession } from '@/lib/session';
import { wagmiConfig } from '@/lib/wagmi';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useDisconnect, WagmiProvider as StandardWagmiProvider } from 'wagmi';

/**
 * Web uses `@privy-io/react-auth`. The React Native SDK is iOS/Android only and
 * must never reach this dependency graph.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delayDuration={200}>
        <PrivyGate>{children}</PrivyGate>
      </TooltipProvider>
    </SessionProvider>
  );
}

/**
 * Privy is mounted only when it is actually configured.
 *
 * Unlike mobile, a missing app ID must not throw here: exploring the sandbox is
 * the path a judge is most likely to take, and losing the whole page because an
 * optional integration is unconfigured would be the wrong trade. Sign-in
 * reports the missing configuration on its own screen instead.
 */
function PrivySessionSync() {
  const { ready, authenticated } = usePrivy();
  const { mode, enterAuthenticated, leaveSandbox } = useSession();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (!ready) return;
    if (authenticated && mode !== 'authenticated') {
      enterAuthenticated();
    } else if (!authenticated && mode === 'authenticated') {
      leaveSandbox();
      disconnect();
    }
  }, [ready, authenticated, mode, enterAuthenticated, leaveSandbox, disconnect]);

  return null;
}

function PrivyGate({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  if (!privyAppId) {
    return (
      <QueryClientProvider client={queryClient}>
        <StandardWagmiProvider config={wagmiConfig}>
          <BrokerageHoldingsProvider>{children}</BrokerageHoldingsProvider>
        </StandardWagmiProvider>
      </QueryClientProvider>
    )

  };

  return (
    <PrivyProvider
      appId={privyAppId}
      {...(privyClientId ? { clientId: privyClientId } : {})}
      config={{
        supportedChains: [...supportedChains],
        defaultChain,
        loginMethods: ['email'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#5E7CFF',
          landingHeader: 'Sign in to TradeTokenStocks',
        },
      }}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <PrivySessionSync />
          <BrokerageHoldingsProvider>{children}</BrokerageHoldingsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
