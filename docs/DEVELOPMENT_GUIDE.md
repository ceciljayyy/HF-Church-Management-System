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

## Quality checklist

- TypeScript compiles cleanly
- Lint passes
- Seed data available
- Dashboard endpoints return real summaries
- Empty, loading, and error states are implemented