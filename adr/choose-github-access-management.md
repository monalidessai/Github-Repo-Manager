# Choose Unified GitHub Collaborator Access Representation with External User Column

## Status
Accepted

## Context
PRD 5.2 outlines repository access management. The application must display collaborators on repositories and allow Tech Leads to revoke access to candidate test repositories. However, there is a core risk of accidentally revoking access for organization members or repo owners.

## Decision
Represent **all** GitHub users having access to the repository in the user interface, but strictly categorize them based on membership parameters fetched live via GitHub API:
1. **Internal Owners & Members**: Flagged as `External: No`. These users represent protected accounts. The user interface displays a `Protected` status indicator instead of a revoke button to safeguard their access.
2. **Outside Collaborators**: Flagged as `External: Yes` and labeled as `"Outside Collaborator"`. The user interface displays an active `Revoke Access` button allowing Tech Leads to remove them.

The sorting order of collaborators lists outside collaborators at the top, ensuring actionable items are visible first, followed by protected internal users.

## Rationale
- **Authoritative Directive**: In Q&A Question 8, the project owner clarified: *"All who have access. With a separate column for external users."*
- **Accidental Deletion Prevention**: Gating the revoke button behind the `isOutsideCollaborator` status prevents administrative accidents where an organization owner is stripped of access.

## Consequences

### Positive
- Unified audit compliance: Tech Leads can review all individuals who have read or write permissions on a candidate's repo.
- Eliminates user error by removing the revoke interface from organization owners/members.

### Gaps
- Performance: Fetching members, owners, and outside collaborators requires making multiple paginated Octokit requests per repository view, which increases the likelihood of hitting GitHub API rate limits.

## Evidence
- `getCollaborators()` in [`github.service.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/github/github.service.ts) paginates and resolves org members, org owners, and outside collaborators, returning `isOutsideCollaborator`, `isOrganizationMember`, and `isOrganizationOwner` flags.
- `RepoDetailsModal.tsx` renders a `Protected` badge instead of the revoke action for non-outside collaborators.
