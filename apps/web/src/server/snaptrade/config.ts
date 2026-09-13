import 'server-only';

/**
 * SnapTrade issues two kinds of key, and which one a deployment holds changes
 * who the brokerage data belongs to:
 *
 * - **commercial** — the server registers a SnapTrade user per Privy subject
 *   and seals that user's secret into a per-user credential. Each person sees
 *   only the brokerage they linked. This is the only safe shape for anything
 *   more than one person can reach.
 * - **personal** — the key *is* a single SnapTrade user. There is nothing to
 *   register, and every signed-in person reads the key owner's brokerage.
 *   Useful for a local demo, unsafe for a deployment.
 *
 * The mode is explicit and defaults to `commercial` on purpose: a
 * misconfiguration must fail closed into per-user isolation rather than
 * silently sharing one person's brokerage with everyone who signs in.
 */
export type SnapTradeKeyMode = 'commercial' | 'personal';

export type SnapTradeServerConfig = {
  mode: SnapTradeKeyMode;
  clientId: string;
  consumerKey: string;
  /** Seals per-user SnapTrade secrets. Present in commercial mode only. */
  credentialKey: Buffer | null;
  privyAppId: string;
  privyVerificationKey: string;
  webRedirectUrl: string;
  mobileRedirectUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing server environment variable ${name}`);
  return value.trim();
}

function keyMode(): SnapTradeKeyMode {
  const declared = process.env.SNAPTRADE_KEY_MODE;
  if (declared === 'personal' || declared === 'commercial') return declared;
  if (declared) throw new Error('SNAPTRADE_KEY_MODE must be "commercial" or "personal"');
  return 'commercial';
}

function credentialKey(mode: SnapTradeKeyMode): Buffer | null {
  // A personal key has no per-user secret to seal, so demanding an encryption
  // key there would only be ceremony.
  if (mode === 'personal') return null;
  const encoded = required(
    'SNAPTRADE_CREDENTIAL_ENCRYPTION_KEY',
    process.env.SNAPTRADE_CREDENTIAL_ENCRYPTION_KEY,
  );
  const key = Buffer.from(encoded, 'base64');
  if (key.byteLength !== 32) {
    throw new Error('SNAPTRADE_CREDENTIAL_ENCRYPTION_KEY must be 32 random bytes in base64');
  }
  return key;
}

export function snapTradeServerConfig(): SnapTradeServerConfig {
  const mode = keyMode();

  return {
    mode,
    clientId: required('SNAPTRADE_CLIENT_ID', process.env.SNAPTRADE_CLIENT_ID),
    consumerKey: required('SNAPTRADE_CONSUMER_KEY', process.env.SNAPTRADE_CONSUMER_KEY),
    credentialKey: credentialKey(mode),
    privyAppId: required('NEXT_PUBLIC_PRIVY_APP_ID', process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    privyVerificationKey: required(
      'PRIVY_VERIFICATION_KEY',
      process.env.PRIVY_VERIFICATION_KEY,
    ).replaceAll('\\n', '\n'),
    webRedirectUrl: required('WEB_APP_URL', process.env.WEB_APP_URL).replace(/\/$/, '') +
      '/connections?connected=1',
    mobileRedirectUrl:
      process.env.MOBILE_APP_REDIRECT_URL ?? 'tradetokenstocks://connections?connected=1',
  };
}
