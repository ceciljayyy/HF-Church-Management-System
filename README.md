# Church Management System

Modern multi-branch Church Management System built with Next.js, TypeScript, PostgreSQL, Prisma, Tailwind CSS, and a clean frontend/backend split.

## Workspace

- apps/web — frontend Next.js app
- apps/api — backend Next.js API app
- packages/shared — shared Zod schemas, permissions, and constants
- docs — product, database, API, UI, and developer documentation

## Getting started

1. Copy environment variables:
   - `.env.example` to `.env`
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run migrations:
   - `npm run prisma:migrate`
5. Seed demo data:
   - `npm run prisma:seed`
6. Start apps:
   - `npm run dev:web`
   - `npm run dev:api`

## Commands

- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Notes

- Frontend never talks directly to the database.
- Backend owns Prisma access and business rules.
- API routes are versioned under `/api/v1`.
- The theme uses a dark charcoal and emerald/lime premium dashboard style.
