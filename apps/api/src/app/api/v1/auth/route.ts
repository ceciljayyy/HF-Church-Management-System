import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      endpoints: ['POST /login', 'GET /me', 'POST /logout'],
    },
  });
}
