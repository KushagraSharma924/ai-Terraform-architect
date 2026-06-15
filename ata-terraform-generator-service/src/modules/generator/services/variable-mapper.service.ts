import { Injectable, Logger } from '@nestjs/common';
import { InfrastructureSpecification } from '@ata/shared-types';
import { ProviderMappingService } from '../../provider-mapping/provider-mapping.service';
import { ResolvedModule, ProviderMappingResult } from '../../provider-mapping/interfaces/provider-mapper.interface';

@Injectable()
export class VariableMapperService {
  private readonly logger = new Logger(VariableMapperService.name);

  constructor(private readonly providerMappingService: ProviderMappingService) {}

  map(
    provider: string,
    spec: InfrastructureSpecification,
    modules: ResolvedModule[],
    projectName: string,
  ): ProviderMappingResult {
    this.logger.log(`Mapping variables for provider ${provider} and project ${projectName}`);
    const mapper = this.providerMappingService.getMapper(provider);
    return mapper.mapVariables(spec, modules, projectName);
  }
}
