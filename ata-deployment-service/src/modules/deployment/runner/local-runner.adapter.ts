import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { RunnerInput, RunnerPort, RunnerResult } from './runner.port';

/**
 * Local terraform runner — writes the project to a one-shot working directory,
 * injects credentials via env only (never to disk), and runs the terraform CLI.
 *
 * This is the integration seam. In an environment without the terraform binary
 * (or real credentials) the run fails cleanly and the orchestrator records it as
 * a failed run — exactly the recoverable-failure path Phase 6 requires.
 */
@Injectable()
export class LocalRunnerAdapter implements RunnerPort {
  private readonly logger = new Logger(LocalRunnerAdapter.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir = config.get<string>('app.runnerWorkDir') ?? '/tmp/ata-deploy-runs';
  }

  async execute(input: RunnerInput): Promise<RunnerResult> {
    const workDir = path.join(this.baseDir, `${input.deploymentId}-${input.runType}-${Date.now()}`);
    await fs.mkdir(workDir, { recursive: true });

    try {
      for (const file of input.files) {
        const target = path.join(workDir, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.content);
      }

      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: input.credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: input.credentials.secretAccessKey,
        AWS_SESSION_TOKEN: input.credentials.sessionToken,
        AWS_REGION: input.region,
        TF_IN_AUTOMATION: 'true',
        TF_INPUT: '0',
      };

      const logs: string[] = [];
      const append = (line: string) => {
        logs.push(line);
        input.onLog?.(line);
      };

      await this.run('terraform', ['init', '-no-color'], workDir, env, append);

      let planSummary: RunnerResult['planSummary'];
      if (input.runType === 'plan') {
        const code = await this.run(
          'terraform',
          ['plan', '-no-color', '-out=tfplan'],
          workDir,
          env,
          append,
        );
        planSummary = this.parsePlanSummary(logs.join('\n'));
        return { exitCode: code, logs: logs.join('\n'), planSummary };
      }

      if (input.runType === 'apply') {
        const code = await this.run(
          'terraform',
          ['apply', '-no-color', '-auto-approve'],
          workDir,
          env,
          append,
        );
        return { exitCode: code, logs: logs.join('\n') };
      }

      const code = await this.run(
        'terraform',
        ['destroy', '-no-color', '-auto-approve'],
        workDir,
        env,
        append,
      );
      return { exitCode: code, logs: logs.join('\n') };
    } finally {
      // One-shot: always tear down the sandbox working directory.
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private run(
    cmd: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    onLine: (line: string) => void,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { cwd, env });
      child.stdout.on('data', (d) => onLine(d.toString()));
      child.stderr.on('data', (d) => onLine(d.toString()));
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) resolve(0);
        else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
      });
    });
  }

  /** Best-effort parse of "Plan: X to add, Y to change, Z to destroy." */
  private parsePlanSummary(output: string): RunnerResult['planSummary'] {
    const m = output.match(/Plan:\s*(\d+) to add,\s*(\d+) to change,\s*(\d+) to destroy/);
    if (!m) return { add: 0, change: 0, destroy: 0 };
    return { add: Number(m[1]), change: Number(m[2]), destroy: Number(m[3]) };
  }
}
