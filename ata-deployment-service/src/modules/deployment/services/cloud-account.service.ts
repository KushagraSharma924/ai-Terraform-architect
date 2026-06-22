import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CloudAccountRepository } from '../repositories/cloud-account.repository';
import { CredentialBroker } from '../credentials/credential-broker';
import type { CloudAccountRecord } from '../../../database/schema';

export interface ConnectAccountInput {
  organizationId: string;
  userId: string;
  authMethod: 'assume_role' | 'oidc';
  roleArn?: string;
  defaultRegion?: string;
}

@Injectable()
export class CloudAccountService {
  constructor(
    private readonly repo: CloudAccountRepository,
    private readonly broker: CredentialBroker,
  ) {}

  /**
   * Begins connecting an AWS account. Returns the externalId the customer must
   * pin in their IAM role's trust policy (confused-deputy protection).
   */
  async connect(input: ConnectAccountInput): Promise<CloudAccountRecord> {
    if (input.authMethod === 'assume_role' && !input.roleArn) {
      throw new BadRequestException('roleArn is required for assume_role');
    }
    const account = await this.repo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      provider: 'aws',
      authMethod: input.authMethod,
      roleArn: input.roleArn,
      defaultRegion: input.defaultRegion ?? 'us-east-1',
      status: 'pending',
    });
    // Stable externalId derived from the account id.
    const externalId = CredentialBroker.deriveExternalId(account.id);
    return this.repo.update(account.id, { externalId });
  }

  /** Verifies access by attempting to mint short-lived credentials. */
  async verify(accountId: string, organizationId: string): Promise<CloudAccountRecord> {
    const account = await this.requireOwned(accountId, organizationId);
    try {
      await this.broker.mint(account, 'verify');
      return this.repo.update(accountId, { status: 'verified', verifiedAt: new Date() });
    } catch (err: any) {
      await this.repo.update(accountId, { status: 'failed' });
      throw new BadRequestException(`Verification failed: ${err?.message ?? 'unknown'}`);
    }
  }

  async list(organizationId: string) {
    return this.repo.listForOrg(organizationId);
  }

  async setGuardrail(
    organizationId: string,
    data: { monthlyLimitUsd?: number; perDeployLimitUsd?: number; action: 'warn' | 'block' },
  ) {
    return this.repo.upsertGuardrail({ organizationId, ...data });
  }

  private async requireOwned(accountId: string, organizationId: string) {
    const account = await this.repo.findById(accountId);
    if (!account || account.organizationId !== organizationId) {
      throw new NotFoundException('Cloud account not found');
    }
    return account;
  }
}
