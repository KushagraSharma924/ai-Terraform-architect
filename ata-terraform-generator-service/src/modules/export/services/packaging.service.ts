import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { TerraformProjectRepository } from '../../generator/repositories/terraform-project.repository';
import { buildZip, ZipEntry } from '../util/zip.util';

export interface PackagedArtifact {
  bytes: Buffer;
  contentHash: string; // sha256 hex
}

/**
 * Assembles a downloadable Terraform project from a stored version:
 *   terraform-project.zip  →  all .tf files + README.md + validation-report.json
 *
 * Deterministic: files are sorted and the zip uses fixed timestamps, so the
 * same version always hashes to the same bytes (enables dedup / cache).
 */
@Injectable()
export class PackagingService {
  constructor(private readonly projectRepo: TerraformProjectRepository) {}

  async buildZipArtifact(versionId: string): Promise<PackagedArtifact> {
    const version = await this.projectRepo.getVersion(versionId);
    if (!version) throw new Error(`Version ${versionId} not found`);

    const files = await this.projectRepo.getFilesForVersion(versionId);
    if (files.length === 0) throw new Error(`Version ${versionId} has no files to package`);

    const validation = await this.projectRepo.getValidationResults(versionId);

    const entries: ZipEntry[] = files
      .map((f) => ({ path: f.filePath, content: f.content }))
      .sort((a, b) => a.path.localeCompare(b.path));

    // validation-report.json
    const validationReport = {
      versionId,
      versionNumber: version.versionNumber,
      validationPassed: version.validationPassed ?? null,
      generatedAt: new Date().toISOString(),
      results: validation.map((v) => ({
        tool: v.tool,
        status: v.status,
        summary: v.summary,
      })),
    };
    entries.push({
      path: 'validation-report.json',
      content: JSON.stringify(validationReport, null, 2),
    });

    // README.md — human-facing usage instructions.
    entries.push({
      path: 'README.md',
      content: this.buildReadme(version.versionNumber, files.length),
    });

    const bytes = buildZip(entries);
    const contentHash = createHash('sha256').update(bytes).digest('hex');
    return { bytes, contentHash };
  }

  private buildReadme(versionNumber: number, fileCount: number): string {
    return [
      '# Terraform Project',
      '',
      `Exported from AI Terraform Architect — version ${versionNumber} (${fileCount} files).`,
      '',
      '## Usage',
      '',
      '```bash',
      'terraform init',
      'terraform plan',
      'terraform apply',
      '```',
      '',
      'See `validation-report.json` for the validation results captured at generation time.',
      '',
    ].join('\n');
  }
}
