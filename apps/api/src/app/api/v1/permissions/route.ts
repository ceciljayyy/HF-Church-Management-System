import { NextResponse } from 'next/server';
import { permissions } from '@church/shared';

export async function GET() {
  return NextResponse.json({ success: true, data: { items: permissions.map((key) => ({ key })) } });
}
