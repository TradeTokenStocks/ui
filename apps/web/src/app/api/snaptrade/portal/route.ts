import { NextRequest, NextResponse } from 'next/server';
import type {
  SnapTradePortalFailure,
  SnapTradePortalRequest,
  SnapTradePortalSuccess,
} from '@tradetoken/domain';

import { snapTradeServerConfig, type SnapTradeServerConfig } from '@/server/snaptrade/config';
import {
  commercialClient,
  openConnectionPortal,
  type SnapTradeScope,
} from '@/server/snaptrade/client';
import { openCredential, sealCredential, snapTradeUserId } from '@/server/snaptrade/credential';
import {
  logUpstreamFailure,
  persistWebCredential,
  privySubject,
  requestCredential,
} from '@/server/snaptrade/session';

export const runtime = 'nodejs';

/**
 * Hands back a URL to SnapTrade's hosted connection portal.
 *
 * The institution credentials are exchanged on SnapTrade's own domain and never
 * reach this app — that is the point of the handoff. What differs by key mode is
 * only *whose* SnapTrade user the brokerage links to: a freshly registered one
 * per Privy subject under a commercial key, or the key owner's single user
 * under a personal key.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(
  status: number,
  code: SnapTradePortalFailure['error']['code'],
  message: string,
  credential?: string,
) {
  return NextResponse.json<SnapTradePortalFailure>(
    { ok: false, error: { code, message }, ...(credential ? { credential } : {}) },
    { status },
  );
}

function parseRequest(value: unknown): SnapTradePortalRequest | null {
  if (!value || typeof value !== 'object' || !('client' in value)) return null;
  if (value.client !== 'web' && value.client !== 'mobile') return null;
  if ('credential' in value && value.credential !== undefined && typeof value.credential !== 'string') {
    return null;
  }
  if ('reconnect' in value && value.reconnect !== undefined) {
    if (typeof value.reconnect !== 'string' || !UUID.test(value.reconnect)) return null;
  }
  return value as SnapTradePortalRequest;
}

type Linked = { scope: SnapTradeScope; sealed?: string };

/**
 * The SnapTrade user this Privy subject connects as, registering one if this is
 * their first time through.
 *
 * A previously sealed credential is reused when it opens, because re-registering
 * would orphan the brokerage already linked to it.
 */
async function linkedUser(
  config: SnapTradeServerConfig,
  subject: string,
  credentialToken: string | undefined,
): Promise<Linked> {
  if (config.mode === 'personal') return { scope: { mode: 'personal' } };

  const credentialKey = config.credentialKey;
  if (!credentialKey) throw new Error('Commercial mode requires a credential encryption key');

  if (credentialToken) {
    const { userId, userSecret } = openCredential(credentialToken, subject, credentialKey);
    return { scope: { mode: 'commercial', userId, userSecret }, sealed: credentialToken };
  }

  const snaptrade = commercialClient(config);
  const userId = snapTradeUserId(subject);
  const register = async (): Promise<Linked> => {
    const registered = (await snaptrade.authentication.registerSnapTradeUser({ userId })).data;
    if (!registered.userSecret) throw new Error('SnapTrade did not return a user secret');
    const userSecret = registered.userSecret;
    return {
      scope: { mode: 'commercial', userId, userSecret },
      sealed: sealCredential({ subject, userId, userSecret }, credentialKey),
    };
  };

  try {
    return await register();
  } catch (error) {
    logUpstreamFailure('registerSnapTradeUser', error);
    // userId is a deterministic hash of the Privy subject, so a lost or
    // cleared local credential collides with a still-registered SnapTrade
    // user — registration fails every time until that orphaned user is
    // removed. Delete it and register fresh once, per SnapTrade's own
    // documented recovery path, before giving up.
    await snaptrade.authentication.deleteSnapTradeUser({ userId });
    return await register();
  }
}

export async function POST(request: NextRequest) {
  let config: SnapTradeServerConfig;
  try {
    config = snapTradeServerConfig();
  } catch {
    return failure(503, 'NOT_CONFIGURED', 'Live brokerage connections are not configured yet.');
  }

  const subject = await privySubject(request, config);
  if (!subject) {
    return failure(401, 'NOT_AUTHENTICATED', 'Sign in before connecting a brokerage.');
  }

  let body: SnapTradePortalRequest | null;
  try {
    body = parseRequest(await request.json());
  } catch {
    body = null;
  }
  if (!body) return failure(400, 'BAD_REQUEST', 'The connection request is invalid.');

  const credentialToken = body.credential ?? requestCredential(request);

  let linked: Linked;
  try {
    linked = await linkedUser(config, subject, credentialToken);
  } catch (error) {
    // A credential that will not open is the user's to repair, not an outage.
    if (credentialToken) {
      return failure(401, 'CREDENTIAL_INVALID', 'Brokerage access must be connected again.');
    }
    logUpstreamFailure('deleteSnapTradeUser + registerSnapTradeUser', error);
    return failure(
      502,
      'UPSTREAM_ERROR',
      'SnapTrade could not create this connection. Try again in a moment.',
    );
  }

  const { scope, sealed } = linked;
  try {
    const redirectUri = await openConnectionPortal(config, scope, {
      customRedirect: body.client === 'web' ? config.webRedirectUrl : config.mobileRedirectUrl,
      ...(body.reconnect ? { reconnect: body.reconnect } : {}),
    });

    const response = NextResponse.json<SnapTradePortalSuccess>({
      ok: true,
      redirectUri,
      // Mobile stores this in SecureStore; web receives it as a cookie below.
      ...(body.client === 'mobile' && sealed ? { credential: sealed } : {}),
    });
    if (body.client === 'web' && sealed) persistWebCredential(response, sealed);
    return response;
  } catch (error) {
    logUpstreamFailure('loginSnapTradeUser', error);
    // The registration above may have succeeded, and losing that secret would
    // orphan the SnapTrade user it created. Hand it back either way.
    const response = failure(
      502,
      'UPSTREAM_ERROR',
      'SnapTrade could not open the portal. Try again.',
      body.client === 'mobile' ? sealed : undefined,
    );
    if (body.client === 'web' && sealed) persistWebCredential(response, sealed);
    return response;
  }
}
