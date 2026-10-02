# Choose Application-Level RBAC with Admin and User Roles

## Status
Accepted

## Context
The Product Requirements Document (PRD) describes "Tech Lead" and "Engineering Manager" as separate personas with distinct workflow responsibilities, but it does not specify concrete application-level user roles, database model attributes, or access permissions.

## Decision
Implement a decoupled Role-Based Access Control (RBAC) model directly in the database and application servers with two distinct roles:
1. **`Admin`**: Has full write access to settings, configuration, and simulation/management features.
2. **`User`**: Has access to view dashboard metrics, repository lists, collaborators, and audit logs. Restricted from saving settings, configuration, or scheduling rules.

The roles are stored as an enum type attribute (`role: UserRole`) in the PostgreSQL database `User` table. Authentication is done via GitHub OAuth, and users are matched against pre-seeded database accounts. Gating is enforced as follows:
- **Backend**: An express-session-based [`SessionGuard`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/common/guards/session.guard.ts) checks for an active user session, and a [`RolesGuard`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/common/guards/roles.guard.ts) inspects the stored user role.
- **Frontend**: Navigation links and settings panels are conditionally hidden or rendered as read-only based on the active user session role.

## Rationale
- **Authoritative Clarification**: In Q&A Question 1, the project owner confirmed: *"You should have RBAC for this."*
- **Role Definition**: In Q&A Question 9, the project owner specified:
  - *"There will be only two roles. Admin -- who can make settings changes and has access to all features. User -- he/she is just a person to manage repos progress. Does not have access to all settings. Just a manager. The config owner/ admin can be stored in the database statically."*
- Decoupling authorization from GitHub organization roles prevents misconfiguration security leaks and ensures local administrative control over permissions.

## Consequences

### Positive
- Strict access control prevents unauthorized users from altering organizational repository policies.
- Direct enforcement on the configuration controller gates the settings API.

### Gaps/Limitations
- **Partial Backend Enforcement**: Retrospective analysis shows that while backend write access to `/settings/update` is guarded via `@Roles(UserRole.ADMIN)` (see [`config.controller.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/config/config.controller.ts)), other lifecycle mutations (like manual repository delete, archive, and override date) in `LifecycleController` and collaborator revocations in `AccessController` are only protected by `SessionGuard`. They do not check if the user is an `Admin` or a `User`, relying purely on the frontend UI to disable these controls for non-admins. This represents an inconsistency between frontend and backend authorization enforcement.

## Evidence
- [`types.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/packages/shared/src/types.ts) declaring the `UserRole` type and session definitions.
- [`roles.guard.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/common/guards/roles.guard.ts) validating the session user role.
- [`config.controller.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/config/config.controller.ts) using `@Roles(UserRole.ADMIN)` to restrict settings modifications.
- [`seed.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/prisma/seed.ts) seeding one static `ADMIN` user (`repomanager-test`) and multiple `USER` users in PostgreSQL.
