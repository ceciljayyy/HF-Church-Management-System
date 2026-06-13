import { NextResponse } from 'next/server';
import { createEntityRoute } from '@/lib/entity-route';

const route = createEntityRoute({ model: 'group', searchFields: ['name', 'description'], archiveField: 'deletedAt' });

export const GET = route.GET;
export const POST = route.POST;
export const PATCH = route.PATCH;
export const DELETE = route.DELETE;

export function HEAD() {
  return NextResponse.redirect('/api/v1/departments');
}
