import { Injectable, Logger } from '@nestjs/common';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import type { StsPort, TemporaryCredentials } from './credential-broker';

@Injectable()
export class AwsStsAdapter implements StsPort {
  private readonly logger = new Logger(AwsStsAdapter.name);

  async assumeRole(input: {
    roleArn: string;
    externalId?: string;
    sessionName: string;
    durationSeconds: number;
  }): Promise<TemporaryCredentials> {
    const client = new STSClient({});

    const command = new AssumeRoleCommand({
      RoleArn: input.roleArn,
      RoleSessionName: input.sessionName,
      ExternalId: input.externalId,
      DurationSeconds: input.durationSeconds,
    });

    this.logger.log(`Assuming role: ${input.roleArn}`);
    const response = await client.send(command);

    const creds = response.Credentials;
    if (!creds?.AccessKeyId || !creds?.SecretAccessKey || !creds?.SessionToken) {
      throw new Error('STS returned incomplete credentials');
    }

    return {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken,
      expiration: creds.Expiration ?? new Date(Date.now() + input.durationSeconds * 1000),
    };
  }
}
