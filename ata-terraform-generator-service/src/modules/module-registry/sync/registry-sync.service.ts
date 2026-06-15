import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { ModuleRegistryRepository } from '../repositories/module-registry.repository';

@Injectable()
export class RegistrySyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RegistrySyncService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly registryRepo: ModuleRegistryRepository,
  ) {}

  async onApplicationBootstrap() {
    await this.syncRegistry();
  }

  async syncRegistry() {
    const modulesPath = this.config.get<string>('app.modulesPath')!;
    this.logger.log(`Starting module registry synchronization from: ${modulesPath}`);

    if (!fs.existsSync(modulesPath)) {
      this.logger.error(`Curated modules library path not found: ${modulesPath}`);
      return;
    }

    const moduleFolders = [
      'aws/networking/vpc',
      'aws/compute/ec2-asg',
      'aws/compute/ecs-fargate',
      'aws/loadbalancing/alb',
      'aws/database/rds-postgresql',
      'aws/security/security-groups',
    ];

    for (const folder of moduleFolders) {
      const fullPath = path.join(modulesPath, folder);
      const metaPath = path.join(fullPath, 'module.meta.json');

      if (!fs.existsSync(metaPath)) {
        this.logger.warn(`Skipping missing module metadata at: ${metaPath}`);
        continue;
      }

      try {
        const metaContent = fs.readFileSync(metaPath, 'utf8');
        const meta = JSON.parse(metaContent);

        await this.registryRepo.upsert({
          provider: meta.provider,
          category: meta.category,
          name: meta.name,
          version: meta.version,
          sourcePath: meta.sourcePath,
          status: 'active',
          requiredVariables: meta.requiredVariables,
          optionalVariables: meta.optionalVariables || null,
          outputs: meta.outputs,
          dependsOn: meta.dependsOn || null,
          supportedIntentKeys: meta.supportedIntentKeys || null,
        });

        this.logger.log(`Synced module: ${meta.provider}/${meta.category}/${meta.name}@${meta.version}`);
      } catch (err: any) {
        this.logger.error(`Failed to sync module from ${metaPath}: ${err.message}`);
      }
    }
  }
}
