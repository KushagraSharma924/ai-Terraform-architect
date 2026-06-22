import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StoragePort } from './storage.port';

@Injectable()
export class LocalStorageAdapter implements StoragePort {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    this.baseDir = config.get<string>('app.artifactStorageDir') ?? '/tmp/ata-artifacts';
  }

  private resolve(key: string): string {
    // Prevent traversal outside the storage root.
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const full = path.join(this.baseDir, safe);
    if (!full.startsWith(path.resolve(this.baseDir))) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(key: string, data: Buffer): Promise<string> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    this.logger.debug(`Stored artifact ${key} (${data.length} bytes)`);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      /* idempotent delete */
    }
  }
}
