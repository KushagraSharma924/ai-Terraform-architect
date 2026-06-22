# AI Terraform Architect — Architecture for Phases 5–10

> Design authored as: Principal Cloud Architect · Staff SWE · Senior DevOps · Platform Architect · DevSecOps Architect · SaaS Product Architect.
> Target scale: 100,000+ users. Stack baseline (existing): NestJS microservices, Drizzle ORM on PostgreSQL, Next.js frontend, NestJS API Gateway, LLM provider lib.
> This is an **architecture document**. No production code is written here.

---

## 0. High-Level Roadmap

| Phase | Name | Theme | Hard Dependency | New Services | Risk |
|-------|------|-------|-----------------|--------------|------|
| 5 | Project Export & Versioning | Make output portable + auditable | Phase 3, 4 | `export-service` (or in project-service), object storage | Low |
| 6 | Cloud Deployment Engine | Actually apply infra to a cloud | Phase 5 | `deployment-service`, `worker-pool`, `credential-service` | **Very High** |
| 7 | AI CloudOps Assistant | Operate & explain running infra | Phase 6 | `cloudops-service`, `inventory-service`, `insight-engine` | High |
| 8 | Security & Compliance Scanner | Shift-left + continuous compliance | Phase 4, 6 | `security-scanner-service` | Medium |
| 9 | Multi-Cloud Support | Generalize generation to Azure/GCP | Phase 3 | provider plugins (libs), not new svc | High |
| 10 | Team Collaboration & Enterprise | Org/RBAC/audit/approvals | All | `org-service`, `notification-service`, `audit-service` | Medium |

**Sequencing logic.** 5 unblocks 6 (you must package before you deploy). 6 unblocks 7 and 8-runtime (you need real state/credentials to observe and scan live infra). 8-static can run in parallel after 4. 9 is orthogonal to 6/7 and can be pulled forward for breadth. 10 is a cross-cutting platform layer best retrofitted once domain services exist, but its data model (orgs) should be **stubbed from day one** to avoid a painful migration.

**Cross-cutting decision made up front (affects every phase):** introduce an `organizationId` tenant column on every table now, even before Phase 10 ships. Multi-tenancy retrofits are the single most expensive migration in SaaS. Default every existing user to a personal org.

Each phase below follows the mandated 17-section template.

---

# PHASE 5 — Project Export & Versioning

### 1. Objectives
- Package a generated Terraform project into a downloadable, reproducible artifact (`terraform-project.zip`).
- Maintain an immutable version history of every generation, validation, and edit.
- Enable diffing between versions, and rollback to any prior version.
- Provide auxiliary artifacts: `validation-report.json`, `architecture-summary.pdf`.
- Establish the **artifact storage architecture** that Phases 6–8 build on.

### 2. Business Value
- Converts ephemeral AI output into a durable deliverable → the core "I can take this with me" value prop.
- Versioning is the foundation of trust and auditability (enterprise requirement, ties to Phase 10 audit).
- Rollback de-risks adoption: users experiment freely knowing they can revert.
- PDF summary is a sales/stakeholder artifact (non-engineers consume it).

### 3. Functional Requirements
- FR5.1 Generate a ZIP containing `main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`, modules tree, `README.md`, `validation-report.json`.
- FR5.2 Every "generate" or "edit" creates a new immutable `project_version` (monotonic version number per project).
- FR5.3 Store generation metadata: prompt, model, token usage, parser intent, generator config.
- FR5.4 Version comparison: structured + textual diff between any two versions.
- FR5.5 Rollback: create a *new* version whose content equals an older version (never mutate history).
- FR5.6 Download management: signed, expiring URLs; download audit; re-download without re-packaging (cache).
- FR5.7 Async PDF rendering of the architecture summary.
- FR5.8 Retention policy + storage tiering (hot → cold).

### 4. Non-Functional Requirements
- ZIP packaging p95 < 3s for typical project (<5MB); PDF async < 30s.
- Artifacts immutable + content-addressed (SHA-256) for dedup and integrity.
- Storage durability 99.999999999% (S3-class); encryption at rest (SSE-KMS) and in transit.
- Signed URL TTL ≤ 15 min. Download throughput scales horizontally (offloaded to object store, not app).
- Version history retained ≥ 1 year (configurable per plan).

### 5. User Stories
- As a developer, I download a ZIP so I can run `terraform init/apply` locally.
- As a developer, I compare v3 and v5 to see what the AI changed.
- As a developer, I roll back to v2 after a bad edit.
- As a manager, I download a PDF architecture summary to share with stakeholders.
- As an auditor, I see who downloaded which version and when.

### 6. Database Changes (Drizzle / Postgres)
```
projects (exists) + organization_id (new, cross-cutting)
project_versions
  id, project_id, organization_id, version_number, parent_version_id,
  source ('generation'|'edit'|'rollback'), generation_id (fk),
  content_hash, manifest_jsonb, created_by, created_at, immutable=true
artifacts
  id, project_version_id, organization_id, type ('zip'|'validation_json'|'pdf'),
  storage_key, content_hash, size_bytes, status ('pending'|'ready'|'failed'),
  checksum, created_at, expires_at
artifact_downloads
  id, artifact_id, user_id, organization_id, ip, user_agent, downloaded_at
version_diffs (cache)
  id, from_version_id, to_version_id, diff_jsonb, computed_at
```
Indexes: `(project_id, version_number desc)`, `(content_hash)`, partial index on `artifacts.status='pending'`.

### 7. API Design (gateway → project/export service)
```
POST   /v1/projects/:id/versions                 -> snapshot current as new version
GET    /v1/projects/:id/versions                 -> paginated history
GET    /v1/projects/:id/versions/:v              -> version detail + manifest
POST   /v1/projects/:id/versions/:v/export       -> request artifact build (zip|pdf) [202]
GET    /v1/artifacts/:id                          -> status + signed download url when ready
GET    /v1/projects/:id/diff?from=:a&to=:b        -> structured diff
POST   /v1/projects/:id/rollback                  -> {targetVersion} => new version [201]
```
Async pattern: `export` returns `202 Accepted` + `artifactId`; client polls `GET /artifacts/:id` or subscribes via SSE/WebSocket. Downloads are 302 redirects to object-store signed URLs.

### 8. Service Layer Design
- `VersioningService` — snapshot, compute version_number, enforce immutability, parent linkage.
- `PackagingService` — assemble file tree → stream zip (no full buffering; pipe to storage).
- `DiffService` — file-tree + HCL-aware diff (parse to AST when possible, fall back to text).
- `ArtifactService` — orchestrate async builds, idempotency by content_hash, signed URL minting.
- `PdfRenderingService` — worker; renders architecture summary (headless Chromium / templating).
- `RetentionService` — scheduled lifecycle transitions + expiry.

### 9. Repository Layer Design
Drizzle repositories, one per aggregate: `ProjectVersionRepository`, `ArtifactRepository`, `DownloadRepository`, `DiffCacheRepository`. All writes to `project_versions`/`artifacts` are append-only; no `update` of content fields exposed. Object store access is abstracted behind a `StoragePort` interface (S3 impl now, swappable).

### 10. Security Considerations
- Signed, short-TTL URLs; never serve artifacts through the app tier.
- Authorization: version/artifact reads scoped to org + project membership (ties to Phase 10 RBAC).
- Integrity: verify content_hash on download; reject tampered objects.
- ZIP-bomb / path-traversal protection during packaging (sanitize file paths).
- Strip secrets: ensure no plaintext credentials are ever serialized into artifacts.

### 11. Monitoring & Logging
- Metrics: packaging latency, artifact build success rate, storage bytes/org, download counts.
- Structured logs with `correlationId` per export request.
- Alerts: artifact build failure rate > 2%, signed-URL minting errors, storage quota breaches.
- Audit log entries for every download (feeds Phase 10).

### 12. Sequence Diagram — Export
```
User → Gateway: POST /versions/:v/export {type=zip}
Gateway → ExportService: build request
ExportService → ArtifactRepo: create artifact(status=pending), dedup by hash
ExportService → Queue: enqueue PackagingJob
ExportService → User: 202 {artifactId}
Worker ← Queue: PackagingJob
Worker → ProjectVersionRepo: load manifest+files
Worker → StoragePort: stream zip upload (SSE-KMS)
Worker → ArtifactRepo: status=ready, storage_key, checksum
User → Gateway: GET /artifacts/:id  → 302 signed URL
User → ObjectStore: download
ObjectStore → DownloadRepo (event): record download
```

### 13. Component Diagram
```
[Next.js] → [Gateway] → [Export/Project Service] → [Postgres]
                               │
                               ├→ [Queue (BullMQ/Redis)] → [Packaging Worker] → [Object Store (S3)]
                               └→ [PDF Worker] ─────────────────────────────────┘
```

### 14. Folder Structure Changes
```
ata-project-service/src/
  versioning/{controller,service,repository,dto}
  export/{packaging.service, pdf.worker, storage.port, s3.adapter}
  diff/{diff.service, hcl-ast.util}
ata-shared-types/src/export/*    # Artifact, ProjectVersion, Diff DTOs
```
(If load justifies, split `export` into a dedicated `ata-export-service`; start in-process.)

### 15. Scalability Considerations
- Stateless workers, horizontally scaled by queue depth.
- Stream (never buffer) large zips; content-addressed dedup cuts storage and rebuild cost.
- Diffs cached; PDF rendering isolated to its own worker pool (Chromium is heavy).
- Storage tiering: hot (S3 Standard) → cold (S3 IA/Glacier) by age.

### 16. Testing Strategy
- Unit: version numbering, immutability guard, diff correctness (incl. HCL AST cases).
- Integration: packaging → storage round-trip with localstack/minio.
- Contract: artifact status state machine.
- E2E: generate → version → export → download → rollback.
- Property test: rollback(v) produces content identical to v.

### 17. Acceptance Criteria
- Generating creates a new immutable version with incremented number.
- ZIP downloads and `terraform init` succeeds on the contents.
- Diff between two versions is accurate and renders in UI.
- Rollback creates new version equal to target; history preserved.
- All downloads audited; signed URLs expire.

---

# PHASE 6 — Cloud Deployment Engine

> Highest-risk phase: it executes mutating actions against customers' real cloud accounts and spends real money. Design is dominated by safety, isolation, and recoverability.

### 1. Objectives
Take a versioned Terraform project → connect a cloud account → `plan` → human approval → `apply` → stream progress → store remote state → support rollback/destroy. AWS first; pluggable for Azure/GCP.

### 2. Business Value
The platform stops being a "code generator" and becomes an "infrastructure platform." This is the step-change in value, pricing power, and stickiness (managed state + deployment history lock-in).

### 3. Functional Requirements
- FR6.1 Connect a cloud account via secure credential method (see credential design).
- FR6.2 Run `terraform plan`, persist plan output + JSON plan, surface human-readable diff.
- FR6.3 Explicit approval gate (with optional multi-approver in Phase 10).
- FR6.4 Execute `apply` asynchronously in an isolated, sandboxed runner.
- FR6.5 Manage remote state (backend) per project/environment, with locking.
- FR6.6 Real-time progress streaming (logs) to UI.
- FR6.7 `destroy` and rollback-to-previous-applied-version.
- FR6.8 Cost estimation (pre-apply via Infracost) + cost guardrails.
- FR6.9 Rate limiting + concurrency caps per org and per cloud account.

### 4. Non-Functional Requirements
- **Isolation**: every run executes in an ephemeral, network-egress-restricted sandbox (one-shot container / Firecracker / ECS task). No credential reuse across tenants.
- **Durability of state**: remote backend (S3+DynamoDB lock per tenant prefix, or Terraform Cloud-style) with versioned state, never lost.
- Apply must be **resumable/idempotent** at the orchestration level (Terraform itself is idempotent; the job wrapper must tolerate worker crash).
- Strict least-privilege; credentials short-lived; zero standing access ideally.
- Plan→approve→apply auditable end-to-end.

### 5. User Stories
- As a user, I connect my AWS account via role assumption without sharing long-lived keys.
- As a user, I review a plan and cost estimate before approving.
- As a user, I watch apply logs live.
- As a user, my apply fails halfway and I get a clear failure explanation + safe next step.
- As an admin, I cap monthly spend / block applies above $X.

### 6. Database Changes
```
cloud_accounts
  id, organization_id, provider, auth_method ('assume_role'|'oidc'|'access_key'),
  external_id, role_arn|kms_secret_ref, region_default, status, verified_at
deployments
  id, project_version_id, cloud_account_id, organization_id, environment,
  state ('queued'|'planning'|'plan_ready'|'awaiting_approval'|'applying'
         |'applied'|'failed'|'destroying'|'destroyed'|'rolled_back'),
  plan_artifact_id, cost_estimate_jsonb, requested_by, approved_by, created_at
deployment_runs            # each plan/apply/destroy execution
  id, deployment_id, run_type, runner_id, exit_code, started_at, finished_at,
  log_storage_key, tf_state_version
tf_state_locks             # if self-managing locking
deployment_events          # state machine transitions (event-sourced audit)
cost_guardrails
  id, organization_id, monthly_limit, per_deploy_limit, action ('warn'|'block')
```

### 7. API Design
```
POST /v1/cloud-accounts                     -> connect (returns externalId/onboarding)
POST /v1/cloud-accounts/:id/verify          -> validate access
POST /v1/deployments                        -> {projectVersionId, cloudAccountId, env} [202]
POST /v1/deployments/:id/plan               -> trigger plan [202]
GET  /v1/deployments/:id                     -> state + plan summary + cost
POST /v1/deployments/:id/approve            -> approval gate
POST /v1/deployments/:id/apply              -> trigger apply [202]
POST /v1/deployments/:id/destroy            -> [202]
POST /v1/deployments/:id/rollback           -> redeploy previous applied version
GET  /v1/deployments/:id/logs               -> SSE/WebSocket stream
```

### 8. Service Layer Design
- `CredentialBrokerService` — mints short-lived creds (STS AssumeRole), never persists secrets in plaintext, hands creds only to the runner via in-memory injection.
- `DeploymentOrchestratorService` — owns the **state machine**; the only component allowed to transition deployment state.
- `PlanService` / `ApplyService` — enqueue runner jobs; parse Terraform JSON output.
- `CostService` — Infracost integration + guardrail evaluation (can block transition).
- `StateBackendService` — provisions/locks per-tenant remote state.
- `RunnerService` — abstracts the sandbox executor (ECS/Fargate task, K8s Job, or Firecracker).
- `LogStreamService` — fan-out runner logs to clients + cold storage.

### 9. Repository Layer Design
`DeploymentRepository`, `DeploymentRunRepository`, `CloudAccountRepository`, `DeploymentEventRepository` (append-only event store — state machine history), `CostGuardrailRepository`. Deployment state transitions persisted as events (event sourcing) for audit + recovery; current state is a projection.

### 10. Security Considerations — **Credential Management (core decision)**

| Method | How | Pros | Cons | Verdict |
|--------|-----|------|------|---------|
| **Access Keys** | User pastes long-lived `AKIA...` | Simple, works everywhere | Long-lived secret stored by us → massive breach blast radius, rotation burden, compliance nightmare | ❌ Avoid (offer only as last-resort, vaulted) |
| **AssumeRole + ExternalId** | Customer creates IAM role trusting our account, scoped by unique `externalId` | No stored secrets, short-lived STS creds, least-priv via role policy, revocable by customer | One-time setup friction | ✅ **Primary for AWS** |
| **OIDC Federation** | Our workload identity federates into customer role (no broker account secret) | No standing trust to a shared account, per-workload identity, best for CI-style | More setup, newer concept for users | ✅ **Preferred long-term / enterprise** |
| **Temporary Credentials** | STS session tokens with TTL | Auto-expire, minimal exposure | Must be derived from one of the above | ✅ Always the *form* creds take at runtime |

**Recommended production architecture:**
1. **AssumeRole + unique ExternalId per cloud_account** as the trust mechanism (default).
2. **OIDC federation** offered for enterprise / self-hosted runners (zero shared-account standing trust).
3. At runtime, **always derive short-lived STS temporary credentials** (15–60 min) scoped to the deployment, injected into the ephemeral runner via memory/env only — never written to disk or DB.
4. Any unavoidable secret (last-resort access keys) goes to a dedicated secrets manager (AWS Secrets Manager / Vault) with envelope encryption (KMS), never the app DB.
5. Per-tenant runner isolation; runner has no access to other tenants' creds or state.

Other security: deny-by-default IAM policy templates, plan-time policy checks (ties to Phase 8 / OPA gate before apply), egress allowlist on runners, immutable audit of every privileged action.

### 11. Monitoring & Logging
- Metrics: queue depth, runner start latency, apply success/fail rate, mean apply duration, cost-per-deploy, credential mint failures.
- Per-deployment correlation id across orchestrator → runner → logs.
- Alerts: apply failure spike, stuck deployments (state timeout), guardrail blocks, abnormal spend.
- Tamper-evident audit log of approvals and applies.

### 12. Sequence Diagram — Deploy
```
User → Gateway → DeploymentSvc: create deployment
DeploymentSvc → CostSvc: estimate (Infracost) → guardrail check
DeploymentSvc → Queue: PlanJob
Runner ← Queue: PlanJob
Runner → CredentialBroker: AssumeRole(externalId) → temp STS creds
Runner → Cloud: terraform plan (remote state, locked)
Runner → DeploymentSvc: plan_ready + json plan + cost
User → DeploymentSvc: approve
DeploymentSvc → Queue: ApplyJob (only if state=awaiting_approval)
Runner ← Queue: ApplyJob → terraform apply (streaming logs → LogStream)
Runner → DeploymentSvc: applied + new state version
DeploymentSvc → EventStore: record transitions (audit)
```

### 13. Component Diagram
```
[Gateway] → [Deployment Service (state machine)] → [Postgres + Event Store]
                  │           │            │
                  │           │            └→ [Cost Service → Infracost]
                  │           └→ [Credential Broker → STS/Secrets Mgr/Vault]
                  └→ [Queue (Redis/BullMQ or SQS)] → [Runner Pool (Fargate/K8s Jobs, isolated)]
                                                          │
                                          [Remote TF State: S3 + DynamoDB lock]
                                                          │
                                              [Log Stream → S3 + WebSocket]
```

### 14. Folder Structure Changes
```
ata-deployment-service/        # NEW microservice
  src/orchestrator/ (state-machine, events)
  src/runner/ (runner.port, fargate.adapter, k8s-job.adapter)
  src/credentials/ (broker, sts.adapter, oidc.adapter, vault.adapter)
  src/cost/ (infracost.service, guardrails)
  src/state-backend/
ata-shared-types/src/deployment/*
```

### 15. Scalability Considerations
- Runner pool autoscaled on queue depth; one ephemeral runner per run (no shared mutable state).
- Per-org + per-cloud-account concurrency caps prevent noisy-neighbor & API throttling from clouds.
- Queue partitioning by org to ensure fairness.
- State locking prevents concurrent applies on same workspace.
- Backpressure + rate limiting at gateway and broker.

### 16. Testing Strategy
- Unit: state machine (exhaustive valid/invalid transitions), guardrail logic.
- Integration: runner against **localstack**; AssumeRole flow against a sandbox account.
- Chaos: kill runner mid-apply → verify lock recovery + no corrupt state + resumable.
- Security tests: cross-tenant credential isolation, no secret persisted to disk/DB.
- Cost guardrail E2E: block apply over limit.

### 17. Acceptance Criteria
- User connects AWS via AssumeRole; no long-lived key stored.
- Plan shows resource diff + cost; apply only possible after approval.
- Apply streams logs live; state stored remotely with locking.
- Runner crash mid-apply does not corrupt state; deployment recoverable.
- Spend over guardrail is blocked/warned per config; all actions audited.

---

# PHASE 7 — AI CloudOps Assistant

### 1. Objectives
Conversational, read-mostly operations assistant over the user's live cloud: answer cost, health, utilization, security-adjacent, and incident questions by aggregating cloud telemetry and reasoning with an LLM. (Reuses Phase 6 credentials — read-only scope.)

### 2. Business Value
Recurring daily-active engagement (vs. one-time generation). Drives retention and expansion revenue; differentiates from pure IaC tools; natural upsell to FinOps/observability tiers.

### 3. Functional Requirements
- FR7.1 Chat interface scoped to a connected cloud account.
- FR7.2 Cloud **inventory engine** — periodic + on-demand resource discovery (EC2, RDS, S3, IAM, etc.).
- FR7.3 **Cost analysis** — Cost Explorer/CUR ingestion, trend + anomaly detection ("why is my bill up?").
- FR7.4 **Monitoring** — CloudWatch metrics/alarms ("show unhealthy EC2").
- FR7.5 **Utilization/waste** — idle/unused resource detection ("which resources are unused?").
- FR7.6 **Incident analysis** — correlate deployment failures + events ("explain deployment failures").
- FR7.7 **Recommendations** — cost/right-sizing/security suggestions with rationale.
- FR7.8 LLM orchestration with **tool/function calling** over the engines; cited, grounded answers.

### 4. Non-Functional Requirements
- Read-only by default; any write/remediation requires explicit confirmation + Phase 6 approval path.
- Answers grounded in fetched data (no hallucinated resource IDs) — RAG/tool-call over real inventory.
- Inventory freshness configurable (cache + TTL); large accounts paginated/streamed.
- Per-tenant data isolation; cloud API rate-limit aware.
- Cost of LLM calls controlled (caching, summarization, token budgets).

### 5. User Stories
- "Why is my AWS bill increasing?" → trend + top cost drivers + diff vs last period.
- "Show unhealthy EC2 instances." → list with status checks/alarms.
- "Which resources are unused?" → idle EBS/EIP/old snapshots/low-CPU instances.
- "Recommend cost optimizations." → prioritized actions w/ est. savings.
- "Explain deployment failures." → correlate Phase 6 logs + cloud events.

### 6. Database Changes
```
cloud_inventory_snapshots
  id, cloud_account_id, organization_id, taken_at, resource_count, status
cloud_resources
  id, snapshot_id, organization_id, provider, service, resource_id, region,
  type, tags_jsonb, config_jsonb, state, discovered_at
cost_records
  id, cloud_account_id, organization_id, service, usage_type, date,
  amount, currency, dimensions_jsonb
cost_anomalies
  id, cloud_account_id, metric, period, expected, actual, score, detected_at
recommendations
  id, organization_id, cloud_account_id, category ('cost'|'health'|'waste'|'security'),
  resource_ref, severity, est_savings, rationale, status ('open'|'dismissed'|'applied')
assistant_conversations / assistant_messages
  ... (chat history, tool calls, citations, token usage)
```

### 7. API Design
```
POST /v1/cloudops/conversations                  -> start chat (scoped to cloud account)
POST /v1/cloudops/conversations/:id/messages     -> user message [streaming response SSE]
POST /v1/cloudops/inventory/refresh              -> trigger discovery [202]
GET  /v1/cloudops/inventory                       -> query resources (filter)
GET  /v1/cloudops/cost/trends                     -> cost timeseries + drivers
GET  /v1/cloudops/recommendations                 -> list
POST /v1/cloudops/recommendations/:id/dismiss
```

### 8. Service Layer Design
- `InventoryEngine` — provider adapters; concurrent describe-calls; normalizes to `cloud_resources`.
- `CostAnalysisEngine` — ingest Cost Explorer/CUR; trend + anomaly (statistical + optional ML).
- `MonitoringEngine` — CloudWatch metrics/alarms; health rollups.
- `IncidentAnalysisEngine` — joins deployment events (Phase 6) + cloud events/logs.
- `RecommendationEngine` — rules + heuristics (idle, oversized, untagged, public, unencrypted).
- `AIOrchestrationLayer` — LLM with **function-calling tools** mapping to the engines; builds grounded context, enforces token budget, returns cited answers. Uses existing `ata-llm-provider-lib`.

### 9. Repository Layer Design
`InventoryRepository`, `CostRepository` (time-series optimized — consider partitioning by month / Timescale), `RecommendationRepository`, `ConversationRepository`. Cloud API access behind `CloudTelemetryPort` (AWS adapter now; Azure Monitor / GCP Monitoring adapters later).

### 10. Security Considerations
- Strictly **read-only IAM** for the assistant's assumed role (separate, lower-priv role than deploy).
- PII/secret scrubbing before sending any cloud data to the LLM; allowlist fields.
- Prompt-injection defense: treat cloud data as untrusted; constrain tool outputs; never let chat trigger writes without the Phase 6 approval gate.
- Per-tenant isolation of inventory + conversation history; encrypt at rest.

### 11. Monitoring & Logging
- Metrics: inventory job duration, cloud API throttle rate, LLM latency/tokens/cost, recommendation acceptance rate.
- Trace each chat turn: message → tool calls → cloud API → LLM → response.
- Alerts: cloud API auth failures, anomaly-detector lag, LLM cost spikes.

### 12. Sequence Diagram — "Why is my bill increasing?"
```
User → CloudOps: message
Orchestrator(LLM): decides tool = cost.getTrends + cost.getDrivers
Orchestrator → CostEngine → CloudTelemetryPort → Cost Explorer
CostEngine → Orchestrator: structured trend + drivers + anomalies
Orchestrator(LLM): synthesize grounded answer w/ citations
CloudOps → User: streamed answer + chart data
```

### 13. Component Diagram
```
[Chat UI] → [Gateway] → [CloudOps Service]
   ├ [AI Orchestration (llm-provider-lib, tool-calling)]
   ├ [Inventory Engine] ─┐
   ├ [Cost Engine]       ├→ [CloudTelemetryPort] → AWS (CE/CW/EC2/RDS/S3/IAM)
   ├ [Monitoring Engine] │            (future: Azure Monitor / GCP Monitoring adapters)
   ├ [Incident Engine] ──┘→ [Phase 6 Deployment Events]
   └ [Recommendation Engine] → [Postgres / time-series store]
```

### 14. Folder Structure Changes
```
ata-cloudops-service/           # NEW
  src/engines/{inventory,cost,monitoring,incident,recommendation}
  src/orchestration/ (tools, planner, grounding)
  src/telemetry/ (aws.adapter, telemetry.port, azure.stub, gcp.stub)
  src/chat/
```

### 15. Scalability Considerations
- Inventory discovery is fan-out/fan-in; rate-limit + backoff per cloud API; cache with TTL.
- Cost data is append-only time-series → partition + roll-ups; precompute trends.
- LLM cost control: context summarization, response caching, cheaper model for routing + stronger model for synthesis.
- Snapshot diffing instead of full re-scan where possible.

### 16. Testing Strategy
- Unit: each engine's normalization + anomaly logic.
- Integration: adapters vs localstack/mocked AWS responses.
- Eval harness for the AI layer: golden Q→expected-grounding (no hallucinated resource IDs), tool-selection accuracy.
- Load: large-account inventory (10k+ resources) pagination.

### 17. Acceptance Criteria
- Each example question returns a grounded, data-backed answer (resource IDs verifiable).
- Inventory refresh discovers and normalizes resources across the 6 services.
- Cost trend + driver breakdown matches Cost Explorer.
- Recommendations are actionable with savings estimates; assistant never writes without approval.

---

# PHASE 8 — Security & Compliance Scanner

### 1. Objectives
Static (pre-deploy, on Terraform) and live (post-deploy, on cloud state) scanning for misconfigurations; risk scoring; compliance mapping (CIS, SOC2, ISO 27001); remediation guidance. Integrate Checkov, tfsec, and OPA.

### 2. Business Value
Enterprise gatekeeper feature — unblocks regulated buyers. "Shift-left security" + "audit-ready compliance reports" are premium-tier, high-willingness-to-pay capabilities. Strong DevSecOps resume signal.

### 3. Functional Requirements
- FR8.1 Static scan of a project version's Terraform (Checkov + tfsec).
- FR8.2 Policy-as-code gate via **OPA/Conftest** (custom + org policies) — can block Phase 6 apply.
- FR8.3 Live scan of deployed state against the same checks.
- FR8.4 Detect: public buckets, open security groups (0.0.0.0/0), weak/over-broad IAM, unencrypted storage, excessive permissions, common misconfigs.
- FR8.5 **Risk scoring engine** — normalize multi-scanner findings → severity-weighted score.
- FR8.6 **Compliance framework engine** — map findings → CIS / SOC2 / ISO 27001 controls.
- FR8.7 Audit reporting (exportable, ties to Phase 5 artifacts → PDF/JSON).
- FR8.8 Remediation suggestions (and where safe, auto-fix patch proposals to the Terraform).

### 4. Non-Functional Requirements
- Scanners run in isolated sandboxes (same isolation posture as Phase 6 runners).
- Deterministic, versioned rule sets (pin scanner + policy versions for reproducible reports).
- Scan a typical project p95 < 30s.
- False-positive management: suppressions with justification + expiry (auditable).

### 5. User Stories
- As a developer, my generated infra is scanned before I can deploy.
- As a security lead, I block deploys that fail org policy (OPA).
- As a compliance officer, I export a SOC2-readiness report mapping findings to controls.
- As a developer, I get a one-click remediation patch for an unencrypted S3 bucket.

### 6. Database Changes
```
scans
  id, organization_id, target_type ('project_version'|'deployment'),
  target_id, scanners_jsonb (versions), status, risk_score, started_at, finished_at
findings
  id, scan_id, organization_id, scanner ('checkov'|'tfsec'|'opa'|'live'),
  rule_id, severity, resource, file, line, message, remediation_jsonb, status
compliance_results
  id, scan_id, framework ('cis'|'soc2'|'iso27001'), control_id, status, finding_refs
suppressions
  id, organization_id, rule_id, resource, reason, created_by, expires_at
policies                # OPA/custom org policies
  id, organization_id, name, rego_source, severity, enabled
```

### 7. API Design
```
POST /v1/scans                         -> {targetType, targetId} [202]
GET  /v1/scans/:id                      -> status + risk score + summary
GET  /v1/scans/:id/findings             -> filterable findings
GET  /v1/scans/:id/compliance?framework=soc2
POST /v1/scans/:id/report               -> generate audit report artifact (Phase 5)
POST /v1/findings/:id/suppress
POST /v1/policies                       -> manage OPA policies
GET  /v1/projects/:id/security-gate     -> pass/fail for deploy gate
```

### 8. Service Layer Design
- `ScanOrchestratorService` — fan-out to scanner adapters, aggregate, dedupe overlapping findings.
- `ScannerAdapters` — `CheckovAdapter`, `TfsecAdapter`, `OpaConftestAdapter`, `LiveScanAdapter` (over Phase 7 inventory).
- `RiskScoringEngine` — weight by severity × exploitability × exposure → 0–100 + grade.
- `ComplianceEngine` — rule→control mapping tables per framework; compute readiness %.
- `RemediationService` — map rule → suggested HCL patch (and propose as a new project version).
- `PolicyGateService` — evaluated by Phase 6 before `apply` (hard/soft gate).

### 9. Repository Layer Design
`ScanRepository`, `FindingRepository`, `ComplianceResultRepository`, `SuppressionRepository`, `PolicyRepository`. Scanner execution behind `ScannerPort`. Mapping tables (rule↔control) versioned and seeded.

### 10. Security Considerations
- Scanners run with no cloud write access; live scan uses read-only role.
- Tamper-proof, append-only findings history for audit integrity.
- Suppressions require justification + expiry; tracked in audit log (Phase 10).
- Pin scanner/rule versions; supply-chain-verify scanner binaries.

### 11. Monitoring & Logging
- Metrics: scan duration, findings by severity, gate pass/fail rate, suppression usage, compliance readiness trend.
- Alerts: critical finding on production deploy, gate bypass attempts, scanner failures.

### 12. Sequence Diagram — Pre-deploy Gate
```
DeploymentSvc → ScanOrchestrator: scan(projectVersion) [pre-apply]
Orchestrator → Checkov/tfsec/OPA adapters (sandbox, parallel)
Adapters → Orchestrator: raw findings
Orchestrator → RiskScoring + Compliance: normalize, score, map
Orchestrator → DeploymentSvc: gate result (pass/block) + risk score
DeploymentSvc: if block & hard-gate → halt apply
```

### 13. Component Diagram
```
[Gateway] → [Security Scanner Service]
   ├ [Checkov] [tfsec] [OPA/Conftest]  (sandboxed)
   ├ [Live Scan ← Phase 7 inventory]
   ├ [Risk Scoring Engine]
   ├ [Compliance Engine (CIS/SOC2/ISO mappings)]
   └ [Remediation Engine] → [Phase 5 versioning]  / gate → [Phase 6]
        → [Postgres]
```

### 14. Folder Structure Changes
```
ata-security-scanner-service/   # NEW
  src/scanners/{checkov,tfsec,opa,live}.adapter
  src/scoring/  src/compliance/{cis,soc2,iso27001}
  src/remediation/  src/policy/  src/orchestrator/
```

### 15. Scalability Considerations
- Parallel scanner execution per scan; scanner workers autoscaled.
- Cache findings by content_hash of Terraform (skip re-scan of unchanged versions).
- Incremental live-scan diffing.

### 16. Testing Strategy
- Unit: scoring weights, compliance mapping correctness, suppression expiry.
- Golden-file tests: known-vulnerable Terraform fixtures → expected findings per scanner.
- Integration: real Checkov/tfsec/OPA binaries on fixtures.
- Regression: pinned rule-set version snapshots.

### 17. Acceptance Criteria
- Vulnerable fixture (public bucket, open SG, unencrypted volume) produces correct findings from all scanners.
- Risk score + grade computed; SOC2/ISO/CIS readiness report exportable.
- OPA gate blocks a failing deploy when hard-gate enabled.
- Remediation suggestion produces a valid corrected Terraform version.

---

# PHASE 9 — Multi-Cloud Support (AWS, Azure, GCP)

### 1. Objectives
Generalize the NL→Terraform pipeline so a single prompt can target AWS, Azure, or GCP via a **provider abstraction layer**, provider registry, resource-mapping engine, and capability matrix.

### 2. Business Value
Triples addressable market; enables cross-cloud and migration use cases; "multi-cloud architect" is a top-tier resume/positioning signal.

### 3. Functional Requirements
- FR9.1 Provider abstraction: parser output is **cloud-agnostic intent**; generation resolves per provider.
- FR9.2 Provider registry: pluggable providers with metadata + supported resources.
- FR9.3 Resource mapping engine: canonical resource (e.g., "object storage") → AWS `s3_bucket` / Azure `storage_account` / GCP `storage_bucket`.
- FR9.4 Cloud capability matrix: what each provider supports + equivalences + gaps.
- FR9.5 Terraform provider abstraction: per-provider module templates + provider blocks.
- FR9.6 Single prompt → choose target cloud(s) → provider-specific Terraform.
- FR9.7 Cross-cloud architectures (e.g., GCP compute + AWS DNS) where feasible.

### 4. Non-Functional Requirements
- Adding a new provider = adding a plugin, **no core changes** (open/closed).
- Generation quality parity tracked per provider via eval suite.
- Capability gaps surfaced explicitly (don't silently drop resources).

### 5. User Stories
- "Deploy a web app with a database and object storage" → choose AWS / Azure / GCP → valid Terraform.
- As an architect, I compare the same architecture across clouds (cost/services).
- As a user, I'm warned when a requested resource has no equivalent on the chosen cloud.

### 6. Database Changes
```
cloud_providers           # registry: id, key, display, status, tf_provider, default_region
canonical_resources       # provider-agnostic resource taxonomy
resource_mappings         # canonical_resource_id, provider, tf_resource_type, module_ref, config_template
capability_matrix         # canonical_resource_id, provider, supported(bool), notes, equivalence_quality
projects + target_provider, target_region   # (existing projects gain provider context)
generations + provider    # track which provider a generation targeted
```

### 7. API Design
```
GET  /v1/providers                          -> registry + status
GET  /v1/providers/:key/capabilities        -> capability matrix
POST /v1/projects/:id/generate              -> {intent, targetProvider, region}
POST /v1/projects/:id/translate             -> {fromProvider, toProvider} cross-cloud mapping
GET  /v1/canonical-resources                 -> taxonomy
```

### 8. Service Layer Design
- `ProviderRegistryService` — discover/load provider plugins.
- `IntentNormalizationService` — Phase 2 parser output → canonical intent model.
- `ResourceMappingEngine` — canonical → provider-specific resources via mapping tables.
- `CapabilityService` — validates intent against capability matrix; reports gaps.
- `ProviderGeneratorPlugins` — `AwsGenerator`, `AzureGenerator`, `GcpGenerator` implementing a common `IProviderGenerator` (refactor of Phase 3).
- `CrossCloudComposer` — multi-provider composition + provider blocks/aliases.

### 9. Repository Layer Design
`ProviderRepository`, `MappingRepository`, `CapabilityRepository`, `CanonicalResourceRepository`. Provider plugins packaged as libs (like `ata-llm-provider-lib`): `ata-provider-aws`, `ata-provider-azure`, `ata-provider-gcp`, each implementing the shared port.

### 10. Security Considerations
- Each provider's generated IaC must pass Phase 8 scanning (provider-specific rule packs).
- Per-provider credential isolation (Phase 6 broker extended to Azure SP / GCP service-account/WIF).
- Capability gaps must not silently degrade to insecure defaults.

### 11. Monitoring & Logging
- Metrics: generation success + validation pass-rate per provider, capability-gap frequency, mapping coverage %.
- Eval dashboards per provider to catch quality drift.

### 12. Sequence Diagram — Single prompt, chosen cloud
```
User → Parser(Phase2): NL prompt → canonical intent
User → Generator: {intent, targetProvider=azure}
Generator → CapabilityService: validate intent vs Azure matrix → gaps?
Generator → ResourceMappingEngine: canonical → azurerm_* resources
Generator → AzureGeneratorPlugin: render modules + provider block
Generator → Phase4 Validation → Phase5 Version
```

### 13. Component Diagram
```
[Parser → Canonical Intent]
        │
[Generation Core] → [Provider Registry] → {AWS plugin | Azure plugin | GCP plugin}
        │                 │
   [Capability Matrix] [Resource Mapping Engine] → provider-specific Terraform
```

### 14. Folder Structure Changes
```
ata-provider-core/             # IProviderGenerator, canonical model, mapping engine
ata-provider-aws/  ata-provider-azure/  ata-provider-gcp/   # plugins (libs)
ata-terraform-modules/{aws,azure,gcp}/   # per-provider module library
ata-terraform-generator-service/src/providers/  # registry + dispatch
```

### 15. Scalability Considerations
- Plugin architecture → linear effort per new provider, zero core regression risk.
- Mapping/capability tables data-driven (update without redeploy).
- Per-provider eval suites gate releases.

### 16. Testing Strategy
- Contract tests: every plugin satisfies `IProviderGenerator`.
- Golden tests: same canonical intent → expected resources per provider.
- Capability-gap tests: unsupported resource → explicit warning, not silent drop.
- `terraform validate` per provider in CI.

### 17. Acceptance Criteria
- One canonical intent generates valid, `terraform validate`-passing Terraform for AWS, Azure, and GCP.
- Unsupported resources surface explicit capability warnings.
- Adding a stub fourth provider requires no core code change.

---

# PHASE 10 — Team Collaboration & Enterprise Features

### 1. Objectives
Multi-tenant org model: Organizations → Teams → Projects; RBAC; shared workspaces; comments; deployment approvals; audit logs; activity timeline; notifications.

### 2. Business Value
Unlocks team/enterprise pricing tiers (the real revenue). Audit + approvals + RBAC are procurement checklist items for enterprise sales. Converts single-player tool into a platform.

### 3. Functional Requirements
- FR10.1 Organizations with members; teams within orgs; projects owned by org/team.
- FR10.2 RBAC: roles (Owner, Admin, Member, Viewer, Billing) + fine-grained permissions; custom roles (enterprise).
- FR10.3 Team workspaces with shared projects/infrastructure.
- FR10.4 Project comments + threaded discussion.
- FR10.5 Deployment approvals (multi-approver, required-reviewer policy) — gates Phase 6 apply.
- FR10.6 Immutable audit logs of all privileged actions.
- FR10.7 Activity timeline per project/org.
- FR10.8 Notifications (in-app, email, webhook/Slack).

### 4. Non-Functional Requirements
- Tenant isolation enforced at data layer (org_id on every row + row-level checks).
- Authorization decisions < 10ms (cache permission sets).
- Audit logs append-only, tamper-evident, retained per compliance policy.
- Notification delivery at-least-once, async, retryable.

### 5. User Stories
- As an org owner, I invite members and assign roles.
- As a team lead, I require two approvals before any production deploy.
- As a reviewer, I comment on a project and approve/reject a deployment.
- As an auditor, I export a full audit trail.
- As a member, I get notified when my deploy is approved or fails.

### 6. Database Changes
```
organizations (id, name, plan, created_by)
organization_members (org_id, user_id, role, status, invited_by)
teams (id, org_id, name)
team_members (team_id, user_id, role)
roles / permissions / role_permissions   # RBAC (or policy-based)
project_memberships (project_id, principal_type, principal_id, role)
comments (id, org_id, project_id, parent_id, author_id, body, created_at)
approval_policies (id, org_id, project_id?, required_approvers, scope)
deployment_approvals (id, deployment_id, approver_id, decision, comment, decided_at)
audit_logs (id, org_id, actor_id, action, target_type, target_id, metadata_jsonb, ip, created_at)  # append-only
activity_events (id, org_id, project_id, actor_id, type, payload_jsonb, created_at)
notifications (id, org_id, user_id, channel, type, payload_jsonb, read_at, status)
```
**Migration:** backfill every existing table's `organization_id` with each user's personal org.

### 7. API Design
```
POST /v1/orgs  ·  POST /v1/orgs/:id/members  ·  PATCH .../members/:uid (role)
POST /v1/orgs/:id/teams  ·  POST /v1/teams/:id/members
GET/POST /v1/projects/:id/comments
POST /v1/orgs/:id/approval-policies
POST /v1/deployments/:id/approvals   {decision}
GET  /v1/orgs/:id/audit-logs?filters
GET  /v1/projects/:id/activity
GET/POST /v1/notifications  ·  preferences
```

### 8. Service Layer Design
- `OrgService`, `TeamService`, `MembershipService`.
- `AuthorizationService` — central policy decision point (RBAC, optionally ABAC via OPA); cached permission sets; used by **every** service via a guard/interceptor.
- `ApprovalService` — evaluates approval policy, blocks Phase 6 apply until satisfied.
- `CommentService`, `ActivityService` (consumes domain events).
- `AuditService` — append-only writer subscribing to a platform event bus.
- `NotificationService` — channel adapters (in-app/email/webhook/Slack), retry queue.

### 9. Repository Layer Design
One repo per aggregate. `AuditLogRepository` is write-only/append-only (no update/delete API). Permission lookups cached (Redis). All other repos enforce `organization_id` scoping at the query layer (and ideally Postgres RLS as defense-in-depth).

### 10. Security Considerations
- Central authorization guard on every endpoint — no service trusts caller identity blindly.
- Tenant isolation: org_id filter + Postgres Row-Level Security as backstop.
- Audit log integrity: append-only, optionally hash-chained.
- Invitation tokens single-use + expiring; principle of least privilege default role = Viewer.

### 11. Monitoring & Logging
- Metrics: authz decision latency + cache hit rate, approval cycle time, notification delivery success, audit write lag.
- Alerts: authz failures spike (possible attack), audit pipeline lag, notification DLQ growth.

### 12. Sequence Diagram — Deployment Approval
```
User → DeploymentSvc: apply
DeploymentSvc → ApprovalService: policy requires N approvers?
ApprovalService → NotificationService: notify reviewers
Reviewer → ApprovalService: approve (xN)
ApprovalService → DeploymentSvc: approvals satisfied → allow apply
All actions → EventBus → AuditService (append) + ActivityService (timeline)
```

### 13. Component Diagram
```
[Gateway: authZ guard] → [Org/Team/Membership Svc]
        │                       │
   [Authorization Service] ←─ cache(Redis)
        │
[Event Bus] → [Audit Service] [Activity Service] [Notification Service → email/Slack/webhook]
[Approval Service] → gates [Deployment Service Phase 6]
```

### 14. Folder Structure Changes
```
ata-org-service/        # orgs, teams, members, rbac, approvals
ata-notification-service/  # NEW (channels + retry)
ata-audit-service/      # append-only audit + activity (or shared lib + bus consumer)
ata-shared-types/src/{org,rbac,audit,notification}/*
ata-gateway/src/guards/authorization.guard.ts
```

### 15. Scalability Considerations
- Permission sets cached + invalidated on role change.
- Audit/activity/notifications are event-driven & async → don't block request path.
- Notification fan-out via queue with DLQ.
- Partition audit_logs by org + time.

### 16. Testing Strategy
- Unit: RBAC matrix (role × action), approval-policy evaluation.
- Security: cross-tenant access attempts must fail; privilege escalation tests.
- Integration: approval gate blocks Phase 6 apply.
- E2E: invite → role assign → comment → approve → deploy → audit visible.

### 17. Acceptance Criteria
- Org/team/role CRUD with enforced RBAC on every endpoint.
- Cross-tenant access is impossible (verified by tests).
- Multi-approver policy blocks deploy until satisfied.
- All privileged actions appear in immutable audit log + activity timeline.
- Notifications delivered across configured channels.

---

# FINAL OUTPUT — Platform-Wide Architecture

## 1. Complete Platform Architecture
```
                         ┌───────────────┐
        Next.js  ───────▶│  API Gateway  │ (authN, authZ guard, rate-limit, routing)
                         └──────┬────────┘
       ┌──────────────┬─────────┼───────────┬──────────────┬───────────────┐
   auth-service   project/      deployment  cloudops      security-scanner  org-service
                  export-service service     service       service           (+notification,
                       │           │           │              │               audit)
                  ┌────┴────┐  generator(+providers)   ┌──────┴──────┐
                  versioning   intent-service          inventory/cost/insight
                       │
   Cross-cutting: [Event Bus] · [Queue (Redis/BullMQ or SQS)] · [Object Store S3]
                  [Postgres (per-service schemas)] · [Redis cache] · [Secrets Mgr/Vault/KMS]
                  [Runner Pool: isolated ephemeral containers] · [LLM provider lib]
```

## 2. Final Database Schema (domains)
- **Identity/Tenancy:** users, organizations, organization_members, teams, team_members, roles, permissions, project_memberships.
- **Generation:** projects, generations, project_versions, artifacts, version_diffs.
- **Providers:** cloud_providers, canonical_resources, resource_mappings, capability_matrix.
- **Deployment:** cloud_accounts, deployments, deployment_runs, deployment_events, cost_guardrails, tf_state_locks.
- **CloudOps:** cloud_inventory_snapshots, cloud_resources, cost_records, cost_anomalies, recommendations, assistant_conversations/messages.
- **Security:** scans, findings, compliance_results, suppressions, policies.
- **Collaboration:** comments, approval_policies, deployment_approvals, audit_logs, activity_events, notifications.
- Every table carries `organization_id`. Service-per-schema; cross-service references by ID only (no cross-schema FKs).

## 3. Microservice Boundaries
| Service | Owns |
|---------|------|
| auth-service | identity, sessions, tokens (exists) |
| org-service | orgs, teams, RBAC, approvals (Phase 10) |
| project-service (+export) | projects, versions, artifacts (Phase 5) |
| intent-service | NL parsing (exists, Phase 2) |
| generator-service (+provider plugins) | Terraform generation, multi-cloud (Phase 3, 9) |
| validation embedded / generator | validation (Phase 4) |
| deployment-service | orchestration, credentials, runners, cost (Phase 6) |
| cloudops-service | inventory, cost, monitoring, AI assistant (Phase 7) |
| security-scanner-service | static/live scan, compliance (Phase 8) |
| notification-service / audit-service | async cross-cutting (Phase 10) |

Boundary rule: a service owns its data; others reach it only via API or events.

## 4. API Gateway Design
- AuthN (JWT/session validation) + central AuthZ guard (calls org-service authz cache).
- Routing to services; request/response validation against `ata-shared-types`.
- Rate limiting (per org/user/IP), quota enforcement, idempotency keys for mutating calls.
- API versioning (`/v1`), correlation-id injection, SSE/WebSocket passthrough for logs/chat.
- Aggregation/BFF endpoints for the frontend where helpful.

## 5. Event-Driven Architecture
- Domain events: `project.versioned`, `deployment.state_changed`, `scan.completed`, `recommendation.created`, `approval.granted`, etc.
- Producers publish to an event bus; consumers: audit, activity, notifications, analytics.
- Phase 6 uses **event sourcing** for deployment state (audit + recovery).
- Outbox pattern for reliable publish from transactional writes.

## 6. Queue Architecture
- Job queues (BullMQ/Redis or SQS) for: packaging, PDF render, plan/apply runs, inventory scans, security scans, notifications.
- Per-org partitioning + concurrency caps; priority lanes (interactive vs batch).
- Dead-letter queues + retry with backoff; idempotent consumers.
- Runner pool consumes deploy/scan jobs in isolated ephemeral containers.

## 7. CI/CD Architecture
- Per-service pipelines: lint → unit → build → contract tests → container image → scan image (Trivy) → deploy.
- Provider eval suites + `terraform validate` gates for generator/provider plugins.
- Self-dogfood: run Phase 8 scanners on our own IaC.
- Progressive delivery (canary/blue-green) per service; DB migrations gated and reversible (Drizzle).

## 8. Observability Architecture
- **Metrics** (Prometheus/OpenTelemetry) → Grafana; **Tracing** (OTel) across gateway→services→runners→LLM; **Logs** structured + centralized (Loki/ELK) with correlation ids.
- SLOs per service; runner + queue depth dashboards; LLM cost/token dashboards.
- Alerting on golden signals + domain alerts (apply failures, guardrail blocks, authz spikes).

## 9. Security Architecture
- Zero-trust between services (mTLS / signed service tokens).
- Credential broker: AssumeRole+ExternalId / OIDC → short-lived STS; secrets in Vault/KMS, never app DB.
- Tenant isolation: org_id + Postgres RLS; central authZ guard.
- Sandboxed, egress-restricted runners; one-shot, no cross-tenant reuse.
- Encryption at rest (KMS) + in transit (TLS); signed expiring artifact URLs.
- Continuous self-scanning (Phase 8) + audit trails (Phase 10) + prompt-injection defenses (Phase 7).

## 10. Cost Optimization Strategy
- **Compute:** autoscale runners to zero when idle; spot for batch scans; ephemeral over standing.
- **LLM:** model routing (cheap router + strong synthesizer), prompt/response caching, token budgets, context summarization.
- **Storage:** content-addressed dedup, S3 lifecycle tiering, artifact expiry.
- **Cloud telemetry:** cache + incremental diffing instead of full re-scans.
- **Customer-facing:** Infracost guardrails (Phase 6) double as a feature and protect our egress/API costs.

## 11. Infrastructure Architecture
- Kubernetes (EKS) or ECS Fargate; services as deployments, runners as Jobs/Fargate tasks.
- Managed Postgres (RDS/Aurora, per-service schema or DB), Redis (ElastiCache), S3, Secrets Manager, KMS, SQS/managed Kafka.
- VPC with isolated runner subnets + egress control; WAF at edge.
- Everything provisioned via Terraform (dogfooding).

## 12. Production Deployment Architecture
- Multi-AZ; horizontal autoscaling on CPU/queue depth.
- Blue-green/canary rollouts; reversible migrations; feature flags per phase.
- DR: cross-region S3 + DB snapshots; RPO/RTO targets defined per tier.
- Tenant noisy-neighbor isolation via per-org rate/concurrency caps.

## 13. Future Roadmap (beyond Phase 10)
- Drift detection & continuous reconciliation.
- GitOps integration (PRs to user repos, CI plan comments).
- FinOps suite + budgets/forecasting; carbon-aware infra.
- Policy marketplace (shareable OPA packs) + module marketplace.
- Self-hosted/BYO-runner enterprise tier; SSO/SCIM; on-prem.
- Agentic auto-remediation (closed-loop with approval gates).

---

## Prioritization & Positioning

### Mandatory for MVP
- **Phase 5 (Export & Versioning)** — without a downloadable, versioned artifact the product is incomplete. Plus the org_id/tenancy stub.
- Already-built Phases 1–4 + Phase 5 = a coherent, shippable MVP ("NL → validated, versioned, downloadable Terraform").

### Optional / tiered (post-MVP, revenue & enterprise)
- **Phase 8 (Security)** — high value, but can ship as static-only first.
- **Phase 9 (Multi-cloud)** — breadth play; optional for MVP, big TAM expansion.
- **Phase 10 (Collaboration)** — required only when selling to teams/enterprise.
- **Phase 7 (CloudOps)** — engagement/retention layer; depends on Phase 6.

### Build-first for maximum resume impact
1. **Phase 6 — Cloud Deployment Engine.** The single most impressive piece: real cloud execution, secure credential brokering (AssumeRole/OIDC), job queues, state machines, sandboxed runners, remote state. This is what separates a toy from a platform.
2. **Phase 8 — Security & Compliance.** DevSecOps signal; concrete, demonstrable (scan a vuln, show CIS/SOC2 report).
3. **Phase 9 — Multi-cloud.** Architecture-maturity signal (plugin/abstraction design).

### What impresses which recruiter
| Role | Most impressive phases | Why |
|------|------------------------|-----|
| **Cloud Engineer** | 6, 9 | Real deploys, credentials, multi-cloud provider depth |
| **DevOps Engineer** | 6, 5, 8 | Pipelines, state mgmt, IaC packaging, security gates |
| **Platform Engineer** | 6, 10, + Final (microservices, queues, event bus) | Multi-tenant platform, RBAC, orchestration, scalability |
| **Solutions Architect** | 9, 7, + Final (whole-platform architecture) | Multi-cloud design, AI ops, end-to-end system design |

**Recommended build order for a portfolio-grade outcome:** Phase 5 → **Phase 6 (flagship)** → Phase 8 (static) → Phase 9 → Phase 7 → Phase 10. Stub `organization_id` everywhere from the very start.
