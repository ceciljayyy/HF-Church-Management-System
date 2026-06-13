import type { NextRequest } from 'next/server';
import { getTokenFromRequest, verifySessionToken } from './session';

export async function getRequestSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}
