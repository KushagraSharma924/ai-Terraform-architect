import { InfrastructureSpecification } from '@ata/shared-types';

export interface ModuleSelection {
  category: string;
  name: string;
  provider: 'aws' | 'azure' | 'gcp';
}

export interface ResolvedModule {
  id: string;
  provider: 'aws' | 'azure' | 'gcp';
  category: string;
  name: string;
  version: string;
  sourcePath: string;
  requiredVariables: string[];
  optionalVariables: string[] | null;
  outputs: string[];
  dependsOn: string[] | null;
}

export interface RootVariableDef {
  name: string;
  type: string;
  default?: any;
  description: string;
}

export interface RootOutputDef {
  name: string;
  value: string;
  description: string;
}

export interface ProviderMappingResult {
  perModule: Record<string, Record<string, any>>;
  rootVariables: RootVariableDef[];
  rootOutputs: RootOutputDef[];
  tfvarsValues: Record<string, any>;
  commonTags: Record<string, string>;
}

export interface ProviderMapper {
  readonly provider: 'aws' | 'azure' | 'gcp';
  mapToModuleSelections(spec: InfrastructureSpecification): ModuleSelection[];
  mapVariables(
    spec: InfrastructureSpecification,
    modules: ResolvedModule[],
    projectName: string,
  ): ProviderMappingResult;
}
