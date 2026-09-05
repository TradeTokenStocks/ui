/**
 * Public Privy client identifiers.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time and ship to the browser, so
 * only public identifiers belong here. A Privy app secret, an authorization
 * private key, a SnapTrade secret or an RPC credential must never be given a
 * `NEXT_PUBLIC_` name — they belong on a server, behind a route handler.
 *
 * Read through explicit property access rather than destructuring
 * `process.env`, which is what lets Next replace them statically.
 */
export const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
export const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

/** Whether a real Privy login can be attempted in this deployment. */
export const isPrivyConfigured = Boolean(privyAppId);
