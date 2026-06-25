import { NextRequest } from 'next/server';
import { z } from 'zod';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';
import { hasPermission } from '@/lib/rbac';

const fundTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultTargetAmount: z.coerce.number().nonnegative().optional(),
  defaultDuration: z.string().optional(),
  requiresTargetAmount: z.boolean().default(true),
  requiresDeadline: z.boolean().default(true),
  requiresContributor: z.boolean().default(true),
  requirePhoneNumber: z.boolean().optional(),
  requireDepartment: z.boolean().optional(),
  requirePaymentSchedule: z.boolean().optional(),
  requireNote: z.boolean().optional(),
  customFields: z.array(z.record(z.string(), z.unknown())).default([]),
  status: z.string().default('ACTIVE'),
});

const fundTypes: any[] = [
  {
    id: 'temple-sacrifice',
    name: 'Temple Sacrifice',
    slug: 'temple-sacrifice',
    description: 'Short-term temple sacrifice fund campaign.',
    defaultTargetAmount: 0,
    defaultDuration: '',
    requiresTargetAmount: true,
    requiresDeadline: true,
    requiresContributor: true,
    customFields: [
      { id: 'member_name', label: 'Member name', type: 'member', required: true },
      { id: 'family_name', label: 'Family name', type: 'text', required: false },
      { id: 'amount_committed', label: 'Amount committed', type: 'amount', required: true },
      { id: 'payment_schedule', label: 'Payment schedule', type: 'text', required: false },
      { id: 'note', label: 'Note', type: 'textarea', required: false },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'pledges',
    name: 'Pledges',
    slug: 'pledges',
    description: 'Pledge fund campaigns and pledge payments.',
    defaultTargetAmount: 0,
    defaultDuration: '',
    requiresTargetAmount: true,
    requiresDeadline: true,
    requiresContributor: true,
    customFields: [
      { id: 'contributor_name', label: 'Contributor name', type: 'member', required: true },
      { id: 'pledged_amount', label: 'Pledged amount', type: 'amount', required: true },
      { id: 'due_date', label: 'Due date', type: 'date', required: true },
      { id: 'payment_frequency', label: 'Payment frequency', type: 'text', required: false },
      { id: 'department', label: 'Department/group', type: 'text', required: false },
      { id: 'note', label: 'Note', type: 'textarea', required: false },
    ],
    status: 'ACTIVE',
  },
];

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function getSession(req: NextRequest) {
  return getRequestSession(req);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!hasPermission(session.permissions, 'funds.view')) return failure('Forbidden', 403);
  return success({ items: fundTypes });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    if (!hasPermission(session.permissions, 'funds.create') && !hasPermission(session.permissions, 'funds.update')) {
      return failure('Forbidden', 403);
    }
    const body = fundTypeSchema.parse(await req.json());
    const item = {
      id: `${slugify(body.name)}-${Date.now().toString(36)}`,
      slug: slugify(body.name),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    fundTypes.push(item);
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create fund type', 500);
  }
}
