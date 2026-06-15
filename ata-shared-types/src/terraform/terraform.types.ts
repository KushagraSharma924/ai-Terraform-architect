export type TerraformProjectStatus =
  | 'pending'
  | 'mapping'
  | 'rendering'
  | 'validating'
  | 'completed'
  | 'failed';

export interface TerraformProject {
  id: string;
  generationId: string;
  projectId: string;
  userId: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  name: string;
  currentVersionId: string | null;
  status: TerraformProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TerraformVersion {
  id: string;
  terraformProjectId: string;
  generationId: string;
  versionNumber: number;
  specSnapshot: any;
  moduleVersionsUsed: Record<string, string>;
  status: TerraformProjectStatus;
  validationPassed: boolean | null;
  fileCount: number | null;
  totalSizeBytes: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface TerraformFile {
  id: string;
  terraformVersionId: string;
  filePath: string;
  fileType: 'root_config' | 'module_file' | 'readme' | 'tfvars';
  content: string;
  checksum: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface GenerationLog {
  id: string;
  terraformVersionId: string;
  stage:
    | 'provider_mapping'
    | 'module_resolution'
    | 'variable_mapping'
    | 'template_rendering'
    | 'module_copy'
    | 'validation'
    | 'persistence';
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata: any | null;
  createdAt: Date;
}

export interface ValidationResult {
  id: string;
  terraformVersionId: string;
  tool: 'terraform_fmt' | 'terraform_validate' | 'tflint' | 'tfsec' | 'checkov' | 'infracost';
  status: 'pass' | 'fail' | 'warning';
  rawOutput: any | null;
  summary: string | null;
  createdAt: Date;
}

export interface ModuleRegistryEntry {
  id: string;
  provider: 'aws' | 'azure' | 'gcp';
  category: 'networking' | 'compute' | 'database' | 'loadbalancing' | 'security' | 'storage' | 'iam';
  name: string;
  version: string;
  sourcePath: string;
  status: 'active' | 'deprecated' | 'retired';
  requiredVariables: string[];
  optionalVariables: string[];
  outputs: string[];
  dependsOn: string[];
  supportedIntentKeys: string[];
  releasedAt: Date;
}
