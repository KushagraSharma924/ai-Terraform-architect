import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GeneratorModule } from '../generator/generator.module';
import { ExportController } from './controllers/export.controller';
import { ArtifactRepository } from './repositories/artifact.repository';
import { PackagingService } from './services/packaging.service';
import { ArtifactService } from './services/artifact.service';
import { ExportProcessor } from './processors/export.processor';
import { LocalStorageAdapter } from './storage/local-storage.adapter';
import { STORAGE_PORT } from './storage/storage.port';

@Module({
  imports: [
    GeneratorModule, // exports TerraformProjectRepository
    BullModule.registerQueue({ name: 'terraform-export' }),
  ],
  controllers: [ExportController],
  providers: [
    ArtifactRepository,
    PackagingService,
    ArtifactService,
    ExportProcessor,
    { provide: STORAGE_PORT, useClass: LocalStorageAdapter },
  ],
  exports: [ArtifactService],
})
export class ExportModule {}
