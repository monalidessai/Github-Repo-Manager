# Choose Cryptographic SHA-256 Hash Chain for Tamper-Evident Audit Logging

## Status
Accepted

## Context
PRD 5.6 requires a tamper-evident, append-only activity history log for all actions performed through the application (such as access revocation, settings updates, manual deletion/archiving, auto-deletions, and logins).

## Decision
Implement a sequential cryptographic hash chain (similar to a block-less Merkle chain) in the database layer.
- Each audit log entry is linked to the previous log entry via its `previousHash` field.
- A SHA-256 hash is computed for each new entry using the following inputs concatenated together:
  `previousHash|id|timestamp|actor|action|repository|ipAddress|canonicalContext`
- An integrity check endpoint `/audit/verify` re-computes hashes sequentially from the genesis node (`previousHash` is `null`, defaulting to string `"GENESIS_NODE"`) to verify the chain's validity. If any hash or linkage mismatch occurs, verification fails and identifies the tampered record.

## Rationale
- **Authoritative Approval**: In Q&A Question 5, the project owner confirmed: *"Continue with what you have used for now."*
- **Algorithmic Security**: SHA-256 provides a standard one-way hash mapping. Sorting inputs and canonicalizing JSON contexts ensures consistent hash calculations.

## Consequences

### Positive
- Independent verification: The database audit table's integrity can be fully verified in real-time.
- Any attempt to modify log rows, insert fake logs, or delete old entries in the middle of the chain is instantly detected during verification.

### Limitations & Security Gaps
- **Lack of Cryptographic Keys (HMAC/Signatures)**: The hashing process uses only standard, public SHA-256 hashing. It does not sign logs using an asymmetric private key or a symmetric HMAC secret key. If an attacker gains full write access to the PostgreSQL database, they could recalculate all hashes from the point of tampering to the tip of the chain, presenting a falsified yet structurally valid chain.
- **Single Threaded Ordering**: Building the chain requires fetching the single latest record to extract `previousHash`. Under extremely high concurrent write loads, race conditions could cause sequence forks.

## Evidence
- [`audit.service.ts`](file:///d:/MyFiles/GitHub-Repo-Manager-System/apps/backend/src/audit/audit.service.ts) containing `canonicalizeJson()`, `calculateHash()`, `log()`, and `verifyChain()`.
- `verifyChain()` returns the verification status, total records, and tampered ID if any.
- `AuditLogPage.tsx` displaying the verification banner (green if valid, red alert if tampered).
