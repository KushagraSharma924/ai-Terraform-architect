import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RunnerFile } from '../runner/runner.port';

export const TERRAFORM_SOURCE = 'TERRAFORM_SOURCE';

export interface TerraformSource {
  /** Fetch all .tf files for a stored project version (the deployable bundle). */
  getVersionFiles(versionId: string, userId: string): Promise<RunnerFile[]>;
}

/**
 * Pulls versioned terraform files from the generator service over HTTP.
 * Forwards the same gateway-style identity header (`x-user-id`) the JWT guard
 * accepts for internal service-to-service calls.
 */
@Injectable()
export class HttpTerraformSource implements TerraformSource {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('app.terraformServiceUrl') ?? 'http://localhost:3005';
  }

  async getVersionFiles(versionId: string, userId: string): Promise<RunnerFile[]> {
    const headers = { 'x-user-id': userId };

    const listRes = await fetch(`${this.baseUrl}/terraform-projects/version/${versionId}/files`, {
      headers,
    });
    if (!listRes.ok) {
      throw new Error(`Failed to list version files: ${listRes.status}`);
    }
    const fileMetas = (await listRes.json()) as { filePath: string }[];

    const files: RunnerFile[] = [];
    for (const meta of fileMetas) {
      const res = await fetch(
        `${this.baseUrl}/terraform-projects/version/${versionId}/file?path=${encodeURIComponent(meta.filePath)}`,
        { headers },
      );
      if (!res.ok) throw new Error(`Failed to fetch ${meta.filePath}: ${res.status}`);
      const body = (await res.json()) as { content: string };
      files.push({ path: meta.filePath, content: body.content });
    }
    return files;
  }
}
