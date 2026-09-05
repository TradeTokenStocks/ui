import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

type CredentialPayload = {
  version: 1;
  subject: string;
  userId: string;
  userSecret: string;
};

export const SNAPTRADE_CREDENTIAL_COOKIE = 'tts-snaptrade';

export function snapTradeUserId(subject: string): string {
  return `tts_${createHash('sha256').update(subject).digest('hex').slice(0, 40)}`;
}

export function sealCredential(payload: Omit<CredentialPayload, 'version'>, key: Buffer): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const plaintext = Buffer.from(JSON.stringify({ version: 1, ...payload } satisfies CredentialPayload));
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function openCredential(token: string, subject: string, key: Buffer): CredentialPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed credential');
  const [noncePart, tagPart, encryptedPart] = parts;
  if (!noncePart || !tagPart || !encryptedPart) throw new Error('Malformed credential');

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(noncePart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const value: unknown = JSON.parse(plaintext);
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('subject' in value) ||
    value.subject !== subject ||
    !('userId' in value) ||
    typeof value.userId !== 'string' ||
    !('userSecret' in value) ||
    typeof value.userSecret !== 'string'
  ) {
    throw new Error('Credential does not belong to this user');
  }
  return value as CredentialPayload;
}
