# Choose Monorepo Architecture using Nx and pnpm Workspaces

## Status
Accepted

## Context
The repository manages multiple distinct components:
1. A frontend dashboard (React SPA).
2. A backend API server (NestJS API).
3. A shared code package (`@repo-manager/shared`) containing common DTOs, constants, and interfaces.

Managing these components in separate repositories would increase overhead for local setups, dependency sharing, versioning, and CI/CD configuration. A monorepo layout is chosen to consolidate all code under a single repository.

## Decision
Organize the codebase as a monorepo using:
- **`pnpm` workspaces**: For package isolation, boundary definition, and local dependency resolution via `workspace:*` protocols.
- **`Nx`**: For monorepo task orchestration, dependent task sorting, and build output caching.

The workspace structures packages into two main directories:
- `apps/`: High-level deployable units (`apps/frontend`, `apps/backend`).
- `packages/`: Shared packages (`packages/shared`).

## Rationale
- **Code Sharing**: Frontend and backend both consume `@repo-manager/shared` directly. Using `pnpm` workspaces allows changes to the shared library to reflect immediately without requiring npm registry publication.
- **Orchestration**: `Nx` handles dependency-aware tasks. For example, building the backend or frontend automatically triggers the build of the shared package first, specified via target configurations in `nx.json`.

## Consequences

### Positive
- Unified version control for the entire application stack.
- Single command dependency installations using `pnpm install` at the root.
- Nx caching speeds up builds and testing by bypassing unchanged packages.

### Trade-offs
- Increased complexity in root configuration files (`package.json`, `pnpm-workspace.yaml`, `nx.json`).
- Developers must understand workspace boundary rules to avoid circular dependencies.

## Evidence
- [`pnpm-workspace.yaml`](file:///d:/MyFiles/GitHub-Repo-Manager-System/pnpm-workspace.yaml) defining workspace paths.
- [`nx.json`](file:///d:/MyFiles/GitHub-Repo-Manager-System/nx.json) defining project dependencies and target configurations.
- Root [`package.json`](file:///d:/MyFiles/GitHub-Repo-Manager-System/package.json) utilizing workspaces and concurrent developer run scripts.
- [`apps/backend/package.json`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/package.json) referencing `"@repo-manager/shared": "workspace:*"`.
