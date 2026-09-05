'use client';

import { PrivyProvider } from '@privy-io/react-auth';

import { TooltipProvider } from '@/components/ui/tooltip';
import { SessionProvider } from '@/lib/session';
import { privyAppId, privyClientId } from '@/lib/privy';

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
function PrivyGate({ children }: { children: React.ReactNode }) {
  if (!privyAppId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={privyAppId}
      {...(privyClientId ? { clientId: privyClientId } : {})}
      config={{
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
      {children}
    </PrivyProvider>
  );
}
