import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifySessionToken } from './lib/session';

const publicRoutes = ['/api/v1/auth/login', '/api/v1/auth/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 },
    );
  }
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
