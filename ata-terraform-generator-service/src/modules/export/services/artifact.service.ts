import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ArtifactRepository } from '../repositories/artifact.repository';
import { PackagingService } from './packaging.service';
import { STORAGE_PORT, StoragePort } from '../storage/storage.port';

const FILE_NAMES: Record<string, string> = {
  zip: 'terraform-project.zip',
};

@Injectable()
export class ArtifactService {
  private readonly logger = new Logger(ArtifactService.name);
  private readonly ttlSeconds: number;

  constructor(
    private readonly artifactRepo: ArtifactRepository,
    private readonly packaging: PackagingService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @InjectQueue('terraform-export') private readonly exportQueue: Queue,
    config: ConfigService,
  ) {
    this.ttlSeconds = config.get<number>('app.artifactSignedUrlTtlSeconds') ?? 900;
  }

  /**
   * Request an export. Returns an existing ready artifact if one exists
   * (cache), otherwise creates a pending artifact and enqueues the build.
   */
  async requestExport(versionId: string, type = 'zip') {
    const cached = await this.artifactRepo.findReady(versionId, type);
    if (cached) return { artifact: cached, cached: true };

    const artifact = await this.artifactRepo.create({
      terraformVersionId: versionId,
      type,
      status: 'pending',
      fileName: FILE_NAMES[type] ?? `artifact-${type}`,
    });

    await this.exportQueue.add('build-artifact', { artifactId: artifact.id, type });
    return { artifact, cached: false };
  }

  /** Executed by the export worker. Packages, stores, and marks the artifact ready. */
  async buildArtifact(artifactId: string): Promise<void> {
    const artifact = await this.artifactRepo.findById(artifactId);
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);
    if (artifact.status === 'ready') return; // idempotent

    try {
      if (artifact.type !== 'zip') {
        throw new Error(`Unsupported artifact type: ${artifact.type}`);
      }

      const { bytes, contentHash } = await this.packaging.buildZipArtifact(
        artifact.terraformVersionId,
      );
      const storageKey = `versions/${artifact.terraformVersionId}/${artifact.id}.zip`;
      await this.storage.put(storageKey, bytes);

      const expiresAt = this.ttlSeconds > 0 ? new Date(Date.now() + this.ttlSeconds * 1000) : null;
      await this.artifactRepo.markReady(artifactId, {
        storageKey,
        contentHash,
        sizeBytes: bytes.length,
        expiresAt,
      });
      this.logger.log(`Artifact ${artifactId} ready (${bytes.length} bytes)`);
    } catch (err: any) {
      this.logger.error(`Artifact ${artifactId} build failed: ${err.message}`);
      await this.artifactRepo.markFailed(artifactId, err.message ?? 'unknown error');
      throw err;
    }
  }

  async getArtifact(artifactId: string) {
    const artifact = await this.artifactRepo.findById(artifactId);
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);
    return artifact;
  }

  async listForVersion(versionId: string) {
    return this.artifactRepo.listForVersion(versionId);
  }

  /** Returns the artifact bytes for download and records the download. */
  async download(artifactId: string): Promise<{ fileName: string; bytes: Buffer; contentHash: string }> {
    const artifact = await this.artifactRepo.findById(artifactId);
    if (!artifact) throw new NotFoundException(`Artifact ${artifactId} not found`);
    if (artifact.status !== 'ready' || !artifact.storageKey) {
      throw new NotFoundException(`Artifact ${artifactId} is not ready for download`);
    }
    const bytes = await this.storage.get(artifact.storageKey);
    await this.artifactRepo.incrementDownloadCount(artifactId);
    return { fileName: artifact.fileName, bytes, contentHash: artifact.contentHash! };
  }
}
