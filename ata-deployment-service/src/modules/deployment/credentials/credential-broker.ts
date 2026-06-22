import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';
import type { CloudAccountRecord } from '../../../database/schema';

export interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

/**
 * Port for the underlying STS-style "assume role → temp creds" call.
 * The default mock returns placeholder short-lived creds so the orchestration
 * and runner pipeline is exercisable without a live AWS account. In production
 * this is bound to an adapter backed by `@aws-sdk/client-sts`.
 */
export const STS_PORT = 'STS_PORT';
export interface StsPort {
  assumeRole(input: {
    roleArn: string;
    externalId?: string;
    sessionName: string;
    durationSeconds: number;
  }): Promise<TemporaryCredentials>;
}

@Injectable()
export class MockStsAdapter implements StsPort {
  async assumeRole(input: {
    sessionName: string;
    durationSeconds: number;
  }): Promise<TemporaryCredentials> {
    return {
      accessKeyId: `ASIA${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      secretAccessKey: randomUUID(),
      sessionToken: `mock-session-${input.sessionName}`,
      expiration: new Date(Date.now() + input.durationSeconds * 1000),
    };
  }
}

/**
 * Brokers short-lived credentials for a deployment run.
 *
 * Production posture (Phase 6 §10): AssumeRole + unique externalId is the
 * default trust mechanism; OIDC for enterprise. We NEVER persist long-lived
 * keys — every run gets fresh temporary credentials injected in-memory only.
 */
@Injectable()
export class CredentialBroker {
  private readonly ttl: number;

  constructor(
    @Inject(STS_PORT) private readonly sts: StsPort,
    config: ConfigService,
  ) {
    this.ttl = config.get<number>('app.credentialTtlSeconds') ?? 3600;
  }

  /** Deterministic externalId so the customer's role trust policy can pin it. */
  static deriveExternalId(accountId: string): string {
    return createHash('sha256').update(`ata:${accountId}`).digest('hex').slice(0, 32);
  }

  async mint(account: CloudAccountRecord, deploymentId: string): Promise<TemporaryCredentials> {
    if (account.authMethod === 'access_key') {
      throw new Error('Long-lived access keys are not supported by the broker');
    }
    if (!account.roleArn) {
      throw new Error('Cloud account has no role ARN configured');
    }
    return this.sts.assumeRole({
      roleArn: account.roleArn,
      externalId: account.externalId ?? CredentialBroker.deriveExternalId(account.id),
      sessionName: `ata-deploy-${deploymentId}`.slice(0, 64),
      durationSeconds: this.ttl,
    });
  }
}
