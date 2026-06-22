import type { TemporaryCredentials } from '../credentials/credential-broker';

export const RUNNER_PORT = 'RUNNER_PORT';

export interface RunnerFile {
  path: string;
  content: string;
}

export interface RunnerInput {
  deploymentId: string;
  runType: 'plan' | 'apply' | 'destroy';
  files: RunnerFile[];
  credentials: TemporaryCredentials;
  region: string;
  onLog?: (line: string) => void;
}

export interface RunnerResult {
  exitCode: number;
  logs: string;
  /** Parsed `terraform show -json` plan summary, when runType === 'plan'. */
  planSummary?: { add: number; change: number; destroy: number };
  stateVersion?: number;
}

/**
 * Executes a terraform run inside an isolated, egress-restricted sandbox.
 * Default adapter shells out locally; production binds an ECS/Fargate or
 * Firecracker adapter that enforces one-shot, per-tenant isolation.
 */
export interface RunnerPort {
  execute(input: RunnerInput): Promise<RunnerResult>;
}
