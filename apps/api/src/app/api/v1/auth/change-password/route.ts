import type { NextRequest } from 'next/server';
import { changePassword } from '@/lib/change-password';

export async function POST(req: NextRequest) {
  return changePassword(req);
}
