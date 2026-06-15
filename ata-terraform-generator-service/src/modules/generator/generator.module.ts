import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ModuleRegistryModule } from '../module-registry/module-registry.module';
import { ProviderMappingModule } from '../provider-mapping/provider-mapping.module';
import { TerraformProjectsController } from './controllers/terraform-projects.controller';
import { TerraformProjectRepository } from './repositories/terraform-project.repository';
import { VariableMapperService } from './services/variable-mapper.service';
import { TemplateEngineService } from './services/template-engine.service';
import { FileBuilderService } from './services/file-builder.service';
import { TerraformValidatorService } from './services/terraform-validator.service';
import { TerraformGeneratorService } from './services/terraform-generator.service';
import { TerraformGeneratorProcessor } from './processors/terraform-generator.processor';

@Module({
  imports: [
    ModuleRegistryModule,
    ProviderMappingModule,
    BullModule.registerQueue({
      name: 'terraform-generation',
    }),
  ],
  controllers: [TerraformProjectsController],
  providers: [
    TerraformProjectRepository,
    VariableMapperService,
    TemplateEngineService,
    FileBuilderService,
    TerraformValidatorService,
    TerraformGeneratorService,
    TerraformGeneratorProcessor,
  ],
  exports: [TerraformGeneratorService, TerraformProjectRepository],
})
export class GeneratorModule {}
