import { NextRequest } from 'next/server';
import { failure } from '@/lib/http';
import { getAuthedSession } from '@/lib/people';

export async function POST(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  return failure('WhatsApp birthday messaging will use an official WhatsApp Business provider when configured.', 501);
}
