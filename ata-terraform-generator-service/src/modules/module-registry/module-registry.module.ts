import { Module } from '@nestjs/common';
import { ModuleRegistryRepository } from './repositories/module-registry.repository';
import { RegistrySyncService } from './sync/registry-sync.service';
import { ModuleSelectorService } from './services/module-selector.service';

@Module({
  providers: [ModuleRegistryRepository, RegistrySyncService, ModuleSelectorService],
  exports: [ModuleRegistryRepository, ModuleSelectorService],
})
export class ModuleRegistryModule {}
