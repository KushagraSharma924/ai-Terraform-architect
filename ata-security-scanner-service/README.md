# ata-security-scanner-service (Phase 8 — Security & Compliance Scanner)

Static analysis of a versioned Terraform project → risk score + compliance
mapping (CIS / SOC2 / ISO 27001) → deploy gate. Port `3007`.

## Flow
```
POST /scans {project_version, versionId} → (async) fetch .tf → scanners → risk + compliance → findings
deployment service → GET /scans/gate/:versionId before apply
```

## API (via gateway `/api/v1`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/scans` | Start a scan (202). |
| GET  | `/scans/:id` | Status + risk score + grade. |
| GET  | `/scans/:id/findings` | All findings (open + suppressed). |
| GET  | `/scans/:id/compliance?framework=soc2` | Control-by-control results. |
| POST | `/scans/findings/suppress` | Suppress a rule (reason + optional expiry). |
| GET  | `/scans/gate/:versionId` | Pass/fail gate verdict for deploy. |

## Engines
- **HeuristicScanner** — real, dependency-free detection: public S3 ACLs, open
  security groups (`0.0.0.0/0`), wildcard IAM, unencrypted EBS, public RDS,
  hard-coded secrets. Attributes findings to resource + line.
- **RiskScoringEngine** — severity-weighted 0–100 score + A–F grade
  (sqrt-scaled, criticals cap the grade).
- **ComplianceEngine** — maps findings to CIS / SOC2 / ISO 27001 controls and
  computes readiness %.

## Production scanners
`SCANNER_PORT` is a list. Add `CheckovAdapter`, `TfsecAdapter`, and
`OpaConftestAdapter` (sandboxed CLI binaries) alongside the heuristic scanner —
the orchestrator fans out, dedupes, scores, and gates uniformly.

## Deploy gate
The deployment service calls `GET /scans/gate/:versionId` before apply.
Enforcement is controlled there via `SECURITY_GATE_MODE` (`off`|`warn`|`block`).
The gate blocks on any unsuppressed critical/high finding.
