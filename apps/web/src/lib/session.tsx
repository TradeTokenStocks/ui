'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * How the person looking at the app got here.
 *
 * `sandbox` is a first-class mode, not a logged-out fallback: a judge can walk
 * the entire product without an inbox round-trip. It stays visibly labelled
 * everywhere, because the figures underneath it are fixtures.
 */
export type SessionMode = 'visitor' | 'sandbox' | 'authenticated';

type SessionValue = {
  mode: SessionMode;
  /** True whenever the data on screen is simulated — which is most of the time. */
  isSandbox: boolean;
  enterSandbox: () => void;
  leaveSandbox: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({
  children,
  initialMode = 'visitor',
}: {
  children: React.ReactNode;
  initialMode?: SessionMode;
}) {
  const [mode, setMode] = useState<SessionMode>(initialMode);

  const enterSandbox = useCallback(() => setMode('sandbox'), []);
  const leaveSandbox = useCallback(() => setMode('visitor'), []);

  const value = useMemo<SessionValue>(
    () => ({
      mode,
      // Authenticating through Privy proves the wallet is real. It does not
      // make the brokerage data or the fills real, so the label stays.
      isSandbox: true,
      enterSandbox,
      leaveSandbox,
    }),
    [mode, enterSandbox, leaveSandbox],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within a SessionProvider');
  return value;
}
