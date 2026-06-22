# ata-deployment-service (Phase 6 — Cloud Deployment Engine)

Takes a versioned Terraform project, connects a customer's AWS account, and runs
`plan → approve → apply → destroy` through a sandboxed runner with an
event-sourced state machine. AWS first; Azure/GCP behind the same ports.

## Flow
```
connect account → verify → create deployment → plan → approve → apply → (destroy | rollback)
```

## API (via gateway `/api/v1`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/cloud-accounts` | Connect AWS account (assume_role/oidc). Returns `externalId` to pin in the IAM trust policy. |
| POST | `/cloud-accounts/:id/verify` | Verify access by minting temp credentials. |
| GET  | `/cloud-accounts` | List org accounts. |
| POST | `/cloud-accounts/guardrails` | Set cost guardrail (warn/block). |
| POST | `/deployments` | Create a deployment (202). |
| POST | `/deployments/:id/plan` | Queue a plan (202). |
| POST | `/deployments/:id/approve` | Approval gate. |
| POST | `/deployments/:id/apply` | Queue an apply (202). |
| POST | `/deployments/:id/destroy` | Queue a destroy (202). |
| POST | `/deployments/:id/rollback` | Mark rolled back. |
| GET  | `/deployments/:id` | State + plan summary + cost. |
| GET  | `/deployments/:id/events` | Append-only audit trail. |
| GET  | `/deployments/:id/runs` | Run history. |

## Architecture seams (ports)
Replace the default mock/local adapters with production integrations without
touching orchestration:

| Port | Default | Production |
|------|---------|------------|
| `STS_PORT` | `MockStsAdapter` | `@aws-sdk/client-sts` AssumeRole + externalId |
| `RUNNER_PORT` | `LocalRunnerAdapter` (terraform CLI) | ECS/Fargate or Firecracker one-shot sandbox |
| `TERRAFORM_SOURCE` | `HttpTerraformSource` | (same — pulls versioned files from generator svc) |
| Cost | heuristic in `CostService.estimate` | Infracost adapter |

## Credential posture
No long-lived keys are ever stored. AssumeRole + unique `externalId` is the
default trust mechanism; OIDC for enterprise. Each run mints fresh short-lived
STS credentials injected into the runner in-memory only.

## Env
`DATABASE_URL`, `REDIS_URL`, `JWT_PUBLIC_KEY`, `TERRAFORM_SERVICE_URL`,
`BROKER_AWS_ACCOUNT_ID`, `CREDENTIAL_TTL_SECONDS`, `RUNNER_WORK_DIR`. Port `3006`.
