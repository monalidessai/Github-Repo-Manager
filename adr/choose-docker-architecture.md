# Choose Individual Dockerfiles and Docker Compose for Service Isolation and Networking

## Status
Accepted

## Context
The stack consists of three tiers: a database (PostgreSQL), an API backend, and a web frontend. Running these components locally for development, integration testing, and deployment requires isolation, consistent environment configurations, and local network resolution.

## Decision
Implement a multi-tier containerization layout:
1. Provide a dedicated `Dockerfile` for each application component:
   - **Backend**: Uses a multi-stage `node:20-slim` image, builds the shared library, compiles TypeScript, and runs database pushes/startups.
   - **Frontend**: Uses a multi-stage `node:20-alpine` build step and copies static outputs into an `nginx:alpine` runtime runner.
2. Use **Docker Compose** (`docker-compose.yml`) to orchestrate the entire stack. All containers are linked together on a common bridge network, permitting internal DNS resolution (e.g. backend connects to database using host `postgres:5432`).
3. Local development workflows utilize Docker Compose to run the PostgreSQL container exclusively, while apps run natively on the host using pnpm. Full-stack testing can be containerized entirely.

## Rationale
- **Authoritative Mandate**: In Q&A Question 3, the project owner instructed: *"For every app, you need a docker file. Docker compose is to allow all dockerized app on one network. So your db server locally also you can run via docker compose. Including the db client."*

## Consequences

### Positive
- Component isolation: Each service has its own virtual OS environment, dependencies, and port mapping.
- Local configuration matches production environment variables.
- Simple database start command (`docker compose up postgres -d`).

### Trade-offs
- Building multi-stage Docker images takes longer than native compilation.
- Container port conflicts can arise if local services are already running on ports 5432, 3000, or 5173.

## Evidence
- [`apps/backend/Dockerfile`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/Dockerfile) multi-stage NestJS container.
- [`apps/frontend/Dockerfile`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/frontend/Dockerfile) building React asset dist and mounting onto Nginx.
- [`docker-compose.yml`](file:///d:/MyFiles/GitHub-Repo-Manager-System/docker-compose.yml) linking `postgres`, `backend`, and `frontend` services.
- [`dockerize-and-verify.bat`](file:///d:/MyFiles/GitHub-Repo-Manager-System/dockerize-and-verify.bat) automation script for composing and verifying container health.
