import { NextResponse } from 'next/server';
import { buildClearedCookie } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { success: true },
  });
  response.cookies.set(buildClearedCookie());
  return response;
}
