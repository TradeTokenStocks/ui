import 'server-only';

type SnapTradeServerConfig = {
  clientId: string;
  consumerKey: string;
  credentialKey: Buffer;
  privyAppId: string;
  privyVerificationKey: string;
  webRedirectUrl: string;
  mobileRedirectUrl: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing server environment variable ${name}`);
  return value;
}

export function snapTradeServerConfig(): SnapTradeServerConfig {
  const encodedKey = required(
    'SNAPTRADE_CREDENTIAL_ENCRYPTION_KEY',
    process.env.SNAPTRADE_CREDENTIAL_ENCRYPTION_KEY,
  );
  const credentialKey = Buffer.from(encodedKey, 'base64');
  if (credentialKey.byteLength !== 32) {
    throw new Error('SNAPTRADE_CREDENTIAL_ENCRYPTION_KEY must be 32 random bytes in base64');
  }

  return {
    clientId: required('SNAPTRADE_CLIENT_ID', process.env.SNAPTRADE_CLIENT_ID),
    consumerKey: required('SNAPTRADE_CONSUMER_KEY', process.env.SNAPTRADE_CONSUMER_KEY),
    credentialKey,
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
