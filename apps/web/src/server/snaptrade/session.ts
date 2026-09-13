import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import { importSPKI, jwtVerify } from 'jose';
import { SnaptradeError } from 'snaptrade-typescript-sdk';
import { SNAPTRADE_CREDENTIAL_HEADER } from '@tradetoken/domain';

import type { SnapTradeServerConfig } from './config';
import { openCredential, SNAPTRADE_CREDENTIAL_COOKIE } from './credential';
import type { SnapTradeScope } from './client';

/**
 * Who is asking, and whose brokerage that entitles them to read.
 *
 * The Privy subject is the only identity the server trusts. In commercial mode
 * it also decides the answer: the credential is bound to that subject when it
 * is sealed, so a stolen cookie replayed by a different signed-in user opens to
 * nothing. In personal mode the key already fixes whose data this is, and the
 * subject only gates access.
 */
export async function privySubject(
  request: NextRequest,
  config: SnapTradeServerConfig,
): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  try {
    const verificationKey = await importSPKI(config.privyVerificationKey, 'ES256');
    const verified = await jwtVerify(authorization.slice(7), verificationKey, {
      issuer: 'privy.io',
      audience: config.privyAppId,
    });
    return verified.payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Web keeps the sealed credential in an HttpOnly cookie; mobile has no cookie
 * jar and presents the same value in a header it stored itself.
 */
export function requestCredential(request: NextRequest): string | undefined {
  return (
    request.cookies.get(SNAPTRADE_CREDENTIAL_COOKIE)?.value ??
    request.headers.get(SNAPTRADE_CREDENTIAL_HEADER) ??
    undefined
  );
}

export function persistWebCredential(response: NextResponse, credential: string) {
  response.cookies.set(SNAPTRADE_CREDENTIAL_COOKIE, credential, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/snaptrade',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export type ScopeResult =
  | { ok: true; scope: SnapTradeScope }
  /** Nothing linked yet — an empty state, not a failure. */
  | { ok: false; reason: 'NOT_LINKED' }
  /** A credential that will not open for this subject; the portal must be walked again. */
  | { ok: false; reason: 'CREDENTIAL_INVALID' };

/**
 * The scope for a read. Never registers a SnapTrade user — a GET that silently
 * created an upstream account would be a surprising thing for a refresh button
 * to do. Registration belongs to the portal route, where linking is the point.
 */
export function readScope(
  request: NextRequest,
  config: SnapTradeServerConfig,
  subject: string,
): ScopeResult {
  if (config.mode === 'personal') return { ok: true, scope: { mode: 'personal' } };

  const credentialToken = requestCredential(request);
  if (!credentialToken) return { ok: false, reason: 'NOT_LINKED' };
  if (!config.credentialKey) return { ok: false, reason: 'CREDENTIAL_INVALID' };

  try {
    const { userId, userSecret } = openCredential(credentialToken, subject, config.credentialKey);
    return { ok: true, scope: { mode: 'commercial', userId, userSecret } };
  } catch {
    return { ok: false, reason: 'CREDENTIAL_INVALID' };
  }
}

/**
 * What the client is told about an upstream failure is one sentence, on
 * purpose: a browser has no business learning whether an API key was rejected.
 * The detail still has to land somewhere, or a 502 is unfixable from the
 * outside — so it goes to the server log.
 */
export function logUpstreamFailure(stage: string, error: unknown) {
  const detail =
    error instanceof SnaptradeError
      ? { status: error.status, code: error.code, body: error.responseBody }
      : { message: error instanceof Error ? error.message : String(error) };
  console.error(`[snaptrade] ${stage} failed`, detail);
}
