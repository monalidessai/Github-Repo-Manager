# Choose Tailwind CSS and shadcn/ui for Frontend Styling and Components

## Status
Accepted

## Context
The application dashboard must be clean, highly responsive, and professional for Tech Leads and Engineering Managers. It requires styled elements (modals, countdown badges, settings forms, tab views) that comply with access roles and visual hierarchy.

## Decision
Use **Tailwind CSS** as the primary styling framework, combined with **shadcn/ui** components for core UI layout architecture.
- Tailwind CSS provides utility-first classes to style HTML and customize theme tokens (e.g. `gold` color palette, fonts, spacing).
- shadcn/ui provides pre-styled, accessible components (built on Radix UI primitives like Dialog, Dropdown, Tabs) that reside directly in the codebase and can be modified.
- Configuration is orchestrated via `components.json` and `tailwind.config.js`.

## Rationale
- **Authoritative Mandate**: In Q&A Question 6, the project owner directed: *"Use tailwind,with Shadcn"*, establishing it as the official UI design mandate.
- **Developer Ownership**: shadcn/ui components are copied into the codebase (`apps/frontend/src/components/ui/`) rather than installed as an opaque npm library, giving the team direct code-level ownership over style adjustments.

## Consequences

### Positive
- Unified styling system based on CSS variables inside `index.css`.
- Highly accessible UI controls (WAI-ARIA compliant out of the box via Radix UI).
- Modern premium look and feel (e.g. warm alabaster background, champagne gold borders).

### Trade-offs
- Modifying UI components requires making edits to local files under `/components/ui/` rather than upgrading package dependencies.

## Evidence
- [`components.json`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/frontend/components.json) declaring alias paths and base properties.
- [`tailwind.config.js`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/frontend/tailwind.config.js) configuring class paths and custom color styles (`cream`, `gold`, `alabaster`).
- [`index.css`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/frontend/src/index.css) defining the CSS variables mapping for shadcn colors.
- UI components located under [`apps/frontend/src/components/ui/`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/frontend/src/components/ui).
