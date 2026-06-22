import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GateResult {
  pass: boolean;
  reason: string;
  riskScore?: number;
  grade?: string;
  scanId?: string | null;
}

/**
 * Phase 8 deploy gate client. Queries the security scanner for the latest scan
 * verdict on a project version before an apply is allowed to proceed.
 */
@Injectable()
export class SecurityGate {
  private readonly logger = new Logger(SecurityGate.name);
  private readonly baseUrl: string;
  readonly mode: 'off' | 'warn' | 'block';

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('app.securityServiceUrl') ?? 'http://localhost:3007';
    this.mode = (config.get<string>('app.securityGateMode') as any) ?? 'warn';
  }

  async check(versionId: string): Promise<GateResult> {
    if (this.mode === 'off') return { pass: true, reason: 'gate disabled' };
    try {
      const res = await fetch(`${this.baseUrl}/scans/gate/${versionId}`);
      if (!res.ok) {
        // Fail-open in warn mode, fail-closed in block mode.
        return { pass: this.mode !== 'block', reason: `gate unavailable (${res.status})` };
      }
      return (await res.json()) as GateResult;
    } catch (err: any) {
      this.logger.warn(`Security gate check failed: ${err.message}`);
      return { pass: this.mode !== 'block', reason: 'gate unreachable' };
    }
  }
}
