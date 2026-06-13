# Database Models

The Prisma schema includes models for:

- Church and Branch
- Users, Roles, Permissions, and mappings
- People, Members, Families, Groups, and Events
- Attendance sessions and records
- Kiosk devices
- Financial funds, contributions, expenses, pledges
- First timers, prayer requests, and pastoral care notes
- Notifications, communication campaigns, media assets
- Report snapshots, settings, audit logs, activity logs, plugins

## Data rules

- Soft delete or archive for operational records
- Finance data is audited
- Multi-branch ownership is enforced via `branchId`
- Private pastoral care notes have restricted visibility
- Dashboard reads summary data from backend queries