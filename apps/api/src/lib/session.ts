import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import type { NextRequest } from 'next/server';

const tokenName = 'cms_session';

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: {
  userId: string;
  branchId: string;
  email: string;
  roles: string[];
  permissions: string[];
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  return payload as unknown as {
    userId: string;
    branchId: string;
    email: string;
    roles: string[];
    permissions: string[];
    sub: string;
  };
}

export function getTokenFromRequest(req: NextRequest) {
  return req.cookies.get(tokenName)?.value ?? null;
}

export function sessionCookieName() {
  return tokenName;
}

export function buildSessionCookie(token: string) {
  return {
    name: tokenName,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function buildClearedCookie() {
  return {
    name: tokenName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}
