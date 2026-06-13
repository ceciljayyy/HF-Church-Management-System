import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: await req.text(),
    cache: 'no-store',
  });

  const payload = await response.text();
  const proxied = new NextResponse(payload, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) proxied.headers.set('set-cookie', setCookie);

  return proxied;
}
