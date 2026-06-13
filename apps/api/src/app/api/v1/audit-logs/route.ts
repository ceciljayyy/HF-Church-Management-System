import { createEntityRoute } from '@/lib/entity-route';

const route = createEntityRoute({ model: 'auditLog', searchFields: ['action', 'entity', 'entityId'] });

export const GET = route.GET;
export const POST = route.POST;
export const PATCH = route.PATCH;
export const DELETE = route.DELETE;
