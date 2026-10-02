# Manage Development-Only Simulation and Testing Utilities via Environment Variable Controls

## Status
Accepted

## Context
Validating repository retention policies (e.g. warning alerts at 7 days, auto-deletions/archives at 90 days) requires waiting for actual time to elapse. To enable rapid developer testing and client demonstrations, time simulation (time travel) and scheduler execution triggers must be provided. However, these tools pose a severe security risk if active in a live production environment.

## Decision
Provide development-only testing tools inside the application, subject to strict architectural safeguards:
1. **Scope Gating**: The simulation endpoints (`/scheduler/simulation/*`) are strictly checked via the `SIMULATION_ENABLED` configuration. If `SIMULATION_ENABLED` is not `'true'`, the backend immediately returns a `403 Forbidden` response, preventing any time changes.
2. **UI Controls Visibility**: The time travel inputs, reset buttons, and advance controls are conditionally rendered on the frontend settings panel only when the server returns `simulationEnabled: true`.
3. **Dependency Gating**: All testing packages (e.g., `@nestjs/testing`, `jest`, `ts-jest`, `@types/*`) are installed strictly as `devDependencies` in `package.json`, ensuring they are omitted from production node modules.

## Rationale
- **Authoritative Guidelines**: In Q&A Question 2, the project owner answered: *"You can keep tools you need for developement. Ensure that the packages are installled as dev depdendencies. And controlled via env variable."*

## Consequences

### Positive
- Allows developers to simulate days/weeks of time lapse instantly to verify email-warning rules and scheduler expirations.
- Complete security gating: time travel is disabled in production by removing `SIMULATION_ENABLED=true` from the environment.

### Trade-offs
- The time simulation logic introduces state dependencies on a simulated "offset days" factor (using `SimulationService.getEffectiveNow()`) instead of reading `new Date()` directly, adding small maintenance complexity to date calculations.

## Evidence
- `isSimulationEnabled()` in [`scheduler.controller.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/scheduler/scheduler.controller.ts) checks for the environment variable before allowing simulation mutations.
- `Settings.tsx` gets simulation state from `/scheduler/simulation` and hides time-travel controls if the switch is disabled.
- [`package.json`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/package.json) categorizes testing frameworks under `devDependencies`.
