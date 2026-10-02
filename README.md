# GitHub Repo Manager System 🚀

A production-grade repository management system designed to automate the governance, retention lifecycle, outside collaborator access control, in-app warning notifications, and tamper-evident audit logging of practical test repositories.

---

## 📋 Table of Contents
1. [What problem does this project solve?](#-what-problem-does-this-project-solve)
2. [Who are the intended users?](#-who-are-the-intended-users)
3. [What are the main features of the application?](#-what-are-the-main-features-of-the-application)
4. [System Architecture](#-system-architecture)
5. [How does the repository lifecycle work?](#-how-does-the-repository-lifecycle-work)
6. [How does the application authenticate and communicate with GitHub?](#-how-does-the-application-authenticate-and-communicate-with-github)
7. [GitHub OAuth Setup](#-github-oauth-setup)
8. [How to setup the env values?](#-how-to-setup-the-env-values)
9. [How to setup and run the project?](#-how-to-setup-and-run-the-project)
10. [Where are the API docs?](#-where-are-the-api-docs)
11. [How do you run the project's tests, and how can they be verified?](#-how-do-you-run-the-projects-tests-and-how-can-they-be-verified)
12. [Architecture Decision Records (ADRs)](#-architecture-decision-records-adrs)

---

## 🎯 What problem does this project solve?

When conducting candidate practical tests, organizations create temporary GitHub repositories per candidate. Managing these repositories manually introduces several operational risks:
- **Security Exposure**: Candidate access is frequently not revoked promptly after test completion.
- **Resource Clutter**: Stale test repositories accumulate indefinitely, cluttering the GitHub organization.
- **Lack of Visibility**: There is no central tracking system to identify which repositories are active, warning, expired, or pending cleanup actions.
- **Audit Deficit**: Changes are not logged in a tamper-evident audit history.

This system automates this lifecycle, ensuring all practical test repositories are monitored, candidate access is cleanly removed, and repositories are archived or permanently deleted after a configured retention period.

The application manages GitHub repositories created for candidate practical tests:
- **Naming Convention**: `pt-<role>-<candidate-name>` (e.g., `pt-react-john-doe`).
- **Strict Scope**: Only manages repositories starting with prefix `pt-` (or custom configured prefix) belonging to the configured GitHub organization or account. All other repositories are ignored.
- **Live Data**: Repository metadata is fetched live from GitHub via the official Octokit SDK without duplicating repository data in PostgreSQL.

---

## 👥 Who are the intended users?

The application supports two primary roles:
1. **Admin**:
   - Configures org-level policies (repository prefix filter, default warning period, default retention days, and default action).
   - Manages global settings and time-simulation controls.
2. **User**:
   - Views repository listings, candidate progress, and days remaining.
   - Manages candidate access (manually revoking outside collaborators).
   - Reviews system actions and audit trail history.

---

## ✨ What are the main features of the application?

- **Repository Dashboard**: Displays live metadata parsed from GitHub (candidate name, role, creation date, days active, and remaining days).
- **Access Management & Safeguards**: Lists all repository collaborators, identifying external/outside collaborators with protected badges for organization members and owners.
- **Retention Scheduler**: Runs daily tasks to issue warnings (7 days before expiry) and execute default actions (archive or delete) upon expiry.
- **In-App Warning Notifications**: Displays alert notifications via an interactive dropdown in the navigation bar when a repository enters its warning threshold.
- **Repo Status**: Evaluates and displays dynamic lifecycle statuses (`Live`, `Archived`, or `Pending Deletion` if the repository is within its warning period and scheduled for deletion).
- **Tamper-Evident Audit Log**: Logs all administrative and automated transactions using a SHA-256 cryptographic linear hash chain.
- **Time Simulation Console**: Allows developers to fast-forward time to test warning and expiry policies instantly.

---

## 🏗 System Architecture

The following diagram illustrates the monorepo application components, external integrations, and database access architecture:

```mermaid
graph TD
    Client["React + Vite Frontend"] -->|HTTP / Cookies| Nest["NestJS Backend API"]
    Nest -->|"Prisma ORM"| Postgres[("PostgreSQL DB")]
    Nest -->|"Octokit REST API"| GitHub["GitHub API"]
    Nest -->|"@nestjs/schedule"| Cron["Automated Cron Scheduler"]
    Cron -->|"In-App Alerts"| Notifications["Notification System"]
    Nest -->|"SHA-256 Chain"| Audit["Tamper-Evident Audit Log"]
```

---

## 🔄 How does the repository lifecycle work?

```mermaid
graph TD
    Identify["1. Identify<br>pt- repos"] --> Track["2. Track access<br>& expiry"]
    Track --> Warn["3. Trigger<br>warning alert"]
    Warn --> Expiry{"4. Repo<br>expired?"}
    Expiry -->|Archive| AutoArchive["5a. Auto-Archive<br>(Read-Only)"]
    Expiry -->|Delete| AutoDelete["5b. Auto-Delete<br>(Permanent)"]
```

1. **Identification**: The scheduler fetches all repositories from the configured organization and filters by prefix (default: `pt-`).
2. **Access Control**: Candidates are added as outside collaborators. Tech Leads can revoke their access manually with a single click in the UI.
3. **Warning Alert**: When a repository enters the warning period (default: 7 days remaining), a warning alert is pushed to the in-app notification bell dropdown.
4. **Auto-Expiry**: Once remaining days reach 0, the scheduler executes the configured action:
   - **Archive**: Triggers GitHub API to set the repository status to archived (read-only).
   - **Delete**: Triggers GitHub API to permanently delete the repository.
5. **Overrides**: Admins can override the default retention days or actions for specific repositories using custom dates.

---

## 🔌 How does the application authenticate and communicate with GitHub?

The application uses **GitHub OAuth** to authenticate users and **Octokit REST API** clients to interact with GitHub services:
- **Authentication**: Users login via GitHub OAuth, generating an HTTP-only session cookie. Only usernames provisioned in the database are authorized access.
- **API Communication**: The backend NestJS server makes authenticated REST calls to GitHub using the system token or the user's OAuth access token.

### Required GitHub Scopes & Permissions:
| GitHub Scope | Purpose |
| :--- | :--- |
| `repo` | Read, list, archive, and delete repositories |
| `admin:org` | Verify organization membership and list collaborators |
| `read:user` | Fetch user profile data to associate with audit logs |
| `delete_repo` | Permanently delete repository resources (explicit scope requirement) |

---

## 🔑 GitHub OAuth Setup

To enable GitHub Authentication:

1. Go to **GitHub Settings** ➔ **Developer Settings** ➔ **OAuth Apps** ➔ **New OAuth App** (or open [https://github.com/settings/developers](https://github.com/settings/developers)).
2. Fill in the application fields:
   - **Application Name**: `PT Repo Manager`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization Callback URL**: `http://localhost:3000/auth/callback` *(Must match exactly!)*
3. Copy the generated **Client ID** and **Client Secret** into your `.env` file:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

> [!IMPORTANT]
> The **Authorization Callback URL** MUST be set to `http://localhost:3000/auth/callback`. If set incorrectly, GitHub will show an `Invalid Redirect URI` error screen upon login.

---

## ⚙️ How to setup the env values?

Create a `.env` file in the root directory. Copy variables from `.env.example` and populate their values:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@postgres:5432/repo_manager
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_ORG=your_target_org_or_blank
SESSION_SECRET=min_32_character_long_secret_key
SIMULATION_ENABLED=true
```

---

## 🚀 How to setup and run the project?

The application is fully containerized. To build and run the entire stack (PostgreSQL database, NestJS backend API, and React frontend proxy), follow these commands:

### Prerequisites:
- **Docker** and **Docker Compose** installed and running on your system.

### Build and Launch:
1. **Start the containers**:
   ```bash
   docker compose up --build -d
   ```
2. **Access the application**:
   - Frontend Dashboard: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

*Note: Database schemas are automatically generated and applied using `prisma db push` inside the backend container startup command.*

---

## 📖 Where are the API docs?

- API routes and endpoints are defined directly inside the NestJS controller files under [`apps/backend/src/`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src).
- Critical endpoints include:
  - Authentication: `/auth/github`, `/auth/callback`, `/auth/me`, `/auth/logout`
  - Repositories: `/repos`, `/repos/:repo/collaborators`, `/repos/:repo/revoke`, `/repos/:repo/archive`, `/repos/:repo/delete`
  - Configuration: `/settings`, `/settings/update`
  - Scheduler: `/scheduler/trigger`, `/scheduler/simulation`
  - Audit Trail: `/audit`, `/audit/verify`, `/audit/export`

---

## 🧪 How do you run the project's tests, and how can they be verified?

### Running Unit Tests:
Run the Jest unit test suites directly from the monorepo root:
```bash
# Run backend tests
pnpm --filter backend test

# Run code compilation checks across all projects
pnpm nx run-many -t build
```

### Verification & Tooling:
The application's logic, security constraints, and UI responses have been verified using:
- **Playwright**: For end-to-end (E2E) browser automation testing of user authentication, RBAC restrictions, settings panel toggles, and collaborator lists.
- **Postman**: For backend API validation, route authorization limits, and audit trail SHA-256 chain integrity checks.

---

## 📓 Architecture Decision Records (ADRs)

The design constraints, architectural choices, and structural decisions are logged as historical records under the root [`adr/`](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr) directory:
1. **[Monorepo Workspace](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-monorepo-architecture.md)**: Organizes subprojects using pnpm workspaces and Nx caching.
2. **[Application-Level RBAC](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-application-rbac.md)**: Enforces Admin/User roles decoupled from GitHub organization permissions.
3. **[Prisma ORM Layer](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-prisma.md)**: Uses Prisma Client with PostgreSQL for persistence.
4. **[Unified Collaborators Listing](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-github-access-management.md)**: Displays all collaborators, safeguarding internal owners/members while exposing outside candidates.
5. **[Audit Chain Verification](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-audit-hash-chain.md)**: Implements cryptographically linked log entries to ensure tamper detection.
6. **[Tailwind & shadcn/ui Design](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-tailwind-and-shadcn.md)**: Uses Tailwind CSS utility tokens and radix component layouts.
7. **[Docker Orchestration](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-docker-architecture.md)**: Isolates services on a shared docker network.
8. **[Gated Simulation Controls](file:///d:/MyFiles/GitHub-Repo-Manager-System/adr/choose-manage-development-only-tools.md)**: Restricts time travel features to development environments via environment configurations.
