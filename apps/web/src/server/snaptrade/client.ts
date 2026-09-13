import 'server-only';

import { Snaptrade, SnaptradeAuth } from 'snaptrade-typescript-sdk';

import type { SnapTradeServerConfig } from './config';

/**
 * One façade over SnapTrade's two authentication modes.
 *
 * The SDK types and signs the two differently — a commercial call carries the
 * end user's `userId`/`userSecret` and a `PartnerSignature`, a personal call
 * carries neither and a `PersonalSignature` — so they cannot share a client
 * object. Rather than spread that branch through every route, it is resolved
 * once here and the routes speak in terms of a scope: whose brokerage is being
 * read.
 */
export type SnapTradeScope =
  | { mode: 'personal' }
  /** A SnapTrade user registered against one Privy subject. */
  | { mode: 'commercial'; userId: string; userSecret: string };

export function commercialClient(config: SnapTradeServerConfig) {
  return new Snaptrade({
    auth: SnaptradeAuth.commercialApiKey({
      clientId: config.clientId,
      consumerKey: config.consumerKey,
    }),
  });
}

function personalClient(config: SnapTradeServerConfig) {
  return new Snaptrade({
    auth: SnaptradeAuth.personalApiKey({
      clientId: config.clientId,
      consumerKey: config.consumerKey,
    }),
  });
}

/** Read-only account access for whoever the scope names. */
export function snapTradeReader(config: SnapTradeServerConfig, scope: SnapTradeScope) {
  if (scope.mode === 'personal') {
    const client = personalClient(config);
    return {
      listAccounts: async () => (await client.accountInformation.listUserAccounts()).data,
      listPositions: async (accountId: string) =>
        (await client.accountInformation.getAllAccountPositions({ accountId })).data,
    };
  }

  const client = commercialClient(config);
  const { userId, userSecret } = scope;
  return {
    listAccounts: async () =>
      (await client.accountInformation.listUserAccounts({ userId, userSecret })).data,
    listPositions: async (accountId: string) =>
      (await client.accountInformation.getAllAccountPositions({ accountId, userId, userSecret }))
        .data,
  };
}

/**
 * A hosted connection-portal session. In commercial mode the brokerage links to
 * the scope's SnapTrade user; in personal mode there is only one user it can
 * link to — the key owner's.
 */
export async function openConnectionPortal(
  config: SnapTradeServerConfig,
  scope: SnapTradeScope,
  options: { customRedirect: string; reconnect?: string },
): Promise<string> {
  const request = {
    connectionType: 'read',
    connectionPortalVersion: 'v4',
    customRedirect: options.customRedirect,
    darkMode: true,
    showCloseButton: true,
    ...(options.reconnect ? { reconnect: options.reconnect } : {}),
  } as const;

  const portal =
    scope.mode === 'personal'
      ? (await personalClient(config).authentication.loginSnapTradeUser(request)).data
      : (
          await commercialClient(config).authentication.loginSnapTradeUser({
            ...request,
            userId: scope.userId,
            userSecret: scope.userSecret,
          })
        ).data;

  if (!('redirectURI' in portal) || !portal.redirectURI) {
    throw new Error('SnapTrade did not return a portal URL');
  }
  return portal.redirectURI;
}
