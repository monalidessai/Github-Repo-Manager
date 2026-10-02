# Choose Prisma ORM with PostgreSQL for Database Layer

## Status
Accepted

## Context
The application requires storing static user mappings, system configurations, warnings, audit logs, and repository override configurations. A structured relational database (PostgreSQL) is designated by the project requirements, necessitating an abstraction layer for schema definition and queries.

## Decision
Use **Prisma ORM** as the database access client and object-relational mapping tool. The data store is **PostgreSQL**. The configuration includes:
- A declarative schema file [`schema.prisma`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/prisma/schema.prisma).
- Type-safe database queries generated on demand in the backend via Prisma Client.
- Utilizing `prisma db push` during build steps and Docker Compose initialization to synchronize database schemas with code without writing SQL migration scripts.

## Rationale
- **Authoritative Feedback**: In Q&A Question 7, the project owner confirmed: *"This works for now"*, validating Prisma as the accepted ORM.
- **Developer Speed**: The Prisma Client provides automated type definitions, minimizing queries mismatch bugs.

## Consequences

### Positive
- Schema changes are defined in a single source of truth (`schema.prisma`) and applied directly to PostgreSQL.
- Avoids writing manual SQL code for relational CRUD operations.
- Strong type safety across database operations in NestJS.

### Trade-offs
- Schema synchronization relies on `prisma db push` instead of structured, incremental migrations (`prisma migrate dev`), making tracking database schema versions in production more difficult.

## Evidence
- [`schema.prisma`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/prisma/schema.prisma) defining the models `User`, `SystemConfig`, `RepoOverride`, `AuditLog`, and `Notification`.
- [`prisma.service.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/prisma/prisma.service.ts) exposing the Prisma client as a NestJS provider.
- [`package.json`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/package.json) containing `@prisma/client` and `prisma` dependencies.
