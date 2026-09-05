import { NextRequest, NextResponse } from 'next/server';
import { importSPKI, jwtVerify } from 'jose';
import { Snaptrade, SnaptradeAuth } from 'snaptrade-typescript-sdk';
import type {
  SnapTradePortalFailure,
  SnapTradePortalRequest,
  SnapTradePortalSuccess,
} from '@tradetoken/domain';

import { snapTradeServerConfig } from '@/server/snaptrade/config';
import {
  openCredential,
  sealCredential,
  SNAPTRADE_CREDENTIAL_COOKIE,
  snapTradeUserId,
} from '@/server/snaptrade/credential';

export const runtime = 'nodejs';

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

function persistWebCredential(response: NextResponse, credential: string) {
  response.cookies.set(SNAPTRADE_CREDENTIAL_COOKIE, credential, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/snaptrade',
    maxAge: 60 * 60 * 24 * 365,
  });
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

export async function POST(request: NextRequest) {
  let config: ReturnType<typeof snapTradeServerConfig>;
  try {
    config = snapTradeServerConfig();
  } catch {
    return failure(503, 'NOT_CONFIGURED', 'Live brokerage connections are not configured yet.');
  }

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!accessToken) return failure(401, 'NOT_AUTHENTICATED', 'Sign in before connecting a brokerage.');

  let subject: string;
  try {
    const verificationKey = await importSPKI(config.privyVerificationKey, 'ES256');
    const verified = await jwtVerify(accessToken, verificationKey, {
      issuer: 'privy.io',
      audience: config.privyAppId,
    });
    if (!verified.payload.sub) throw new Error('Missing subject');
    subject = verified.payload.sub;
  } catch {
    return failure(401, 'NOT_AUTHENTICATED', 'Your session expired. Sign in and try again.');
  }

  let body: SnapTradePortalRequest | null;
  try {
    body = parseRequest(await request.json());
  } catch {
    body = null;
  }
  if (!body) return failure(400, 'BAD_REQUEST', 'The connection request is invalid.');

  const credentialToken =
    body.credential ?? request.cookies.get(SNAPTRADE_CREDENTIAL_COOKIE)?.value;
  let userId: string;
  let userSecret: string;
  let sealed = credentialToken;

  const snaptrade = new Snaptrade({
    auth: SnaptradeAuth.commercialApiKey({
      clientId: config.clientId,
      consumerKey: config.consumerKey,
    }),
  });

  if (credentialToken) {
    try {
      ({ userId, userSecret } = openCredential(credentialToken, subject, config.credentialKey));
    } catch {
      return failure(401, 'CREDENTIAL_INVALID', 'Brokerage access must be connected again.');
    }
  } else {
    userId = snapTradeUserId(subject);
    try {
      const registered = (await snaptrade.authentication.registerSnapTradeUser({ userId })).data;
      if (!registered.userSecret) throw new Error('SnapTrade did not return a user secret');
      userSecret = registered.userSecret;
      sealed = sealCredential({ subject, userId, userSecret }, config.credentialKey);
    } catch {
      // userId is a deterministic hash of the Privy subject, so a lost or
      // cleared local credential collides with a still-registered SnapTrade
      // user — registration fails every time until that orphaned user is
      // removed. Delete it and register fresh once, per SnapTrade's own
      // documented recovery path, before giving up.
      try {
        await snaptrade.authentication.deleteSnapTradeUser({ userId });
        const registered = (await snaptrade.authentication.registerSnapTradeUser({ userId })).data;
        if (!registered.userSecret) throw new Error('SnapTrade did not return a user secret');
        userSecret = registered.userSecret;
        sealed = sealCredential({ subject, userId, userSecret }, config.credentialKey);
      } catch {
        return failure(
          502,
          'UPSTREAM_ERROR',
          'SnapTrade could not create this connection. Try again in a moment.',
        );
      }
    }
  }

  try {
    const portal = (
      await snaptrade.authentication.loginSnapTradeUser({
        userId,
        userSecret,
        connectionType: 'read',
        connectionPortalVersion: 'v4',
        customRedirect: body.client === 'web' ? config.webRedirectUrl : config.mobileRedirectUrl,
        darkMode: true,
        showCloseButton: true,
        ...(body.reconnect ? { reconnect: body.reconnect } : {}),
      })
    ).data;
    if (!('redirectURI' in portal) || !portal.redirectURI) {
      throw new Error('SnapTrade did not return a portal URL');
    }

    const payload: SnapTradePortalSuccess = {
      ok: true,
      redirectUri: portal.redirectURI,
      ...(body.client === 'mobile' && sealed ? { credential: sealed } : {}),
    };
    const response = NextResponse.json(payload);
    if (body.client === 'web' && sealed) {
      persistWebCredential(response, sealed);
    }
    return response;
  } catch {
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
