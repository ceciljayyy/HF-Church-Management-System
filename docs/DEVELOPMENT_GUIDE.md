# Development Guide

## Architecture

- Next.js app router for both web and API apps
- Prisma only in backend
- Shared package for Zod schemas, constants, and permission keys
- Feature-based folder structure

## Key principles

- Keep modules isolated
- Validate all inputs with Zod
- Enforce permissions in backend and frontend
- Use soft delete or status fields where possible
- Write audit logs for sensitive changes

## Environment

The API runtime must use the Supabase transaction pooler, while Prisma migrate/db push must use the direct database host.

```bash
# Runtime database connection through Supabase pooler
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=60"

# Direct database connection for Prisma migrate/db push
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
```

Use placeholders in committed examples and keep real secrets only in ignored local `.env` files.

## Quality checklist

- TypeScript compiles cleanly
- Lint passes
- Seed data available
- Dashboard endpoints return real summaries
- Empty, loading, and error states are implemented
