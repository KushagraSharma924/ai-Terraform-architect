import { Injectable, Logger } from '@nestjs/common';
import { TerraformProjectRepository } from '../repositories/terraform-project.repository';
import { ModuleSelectorService } from '../../module-registry/services/module-selector.service';
import { VariableMapperService } from './variable-mapper.service';
import { TemplateEngineService } from './template-engine.service';
import { FileBuilderService } from './file-builder.service';
import { TerraformValidatorService } from './terraform-validator.service';
import { InfrastructureSpecification } from '@ata/shared-types';

@Injectable()
export class TerraformGeneratorService {
  private readonly logger = new Logger(TerraformGeneratorService.name);

  constructor(
    private readonly projectRepo: TerraformProjectRepository,
    private readonly selectorService: ModuleSelectorService,
    private readonly variableMapper: VariableMapperService,
    private readonly templateEngine: TemplateEngineService,
    private readonly fileBuilder: FileBuilderService,
    private readonly validator: TerraformValidatorService,
  ) {}

  async initiate(
    projectId: string,
    userId: string,
    generationId: string,
    projectName: string,
    cloudProvider: 'aws' | 'azure' | 'gcp',
    spec: InfrastructureSpecification,
  ): Promise<string> {
    this.logger.log(`Initiating Terraform project generation for project ${projectId}, generation ${generationId}`);

    // 1. Get or create project
    let project = await this.projectRepo.findProjectByProjectId(projectId);
    if (!project) {
      project = await this.projectRepo.createProject({
        projectId,
        userId,
        generationId,
        name: projectName,
        cloudProvider,
        status: 'pending',
      });
    } else {
      project = await this.projectRepo.updateProject(project.id, {
        generationId,
        status: 'pending',
      });
    }

    // 2. Determine version number
    const latestVersion = await this.projectRepo.getLatestVersionNumber(project.id);
    const versionNumber = latestVersion + 1;

    // 3. Create version
    const version = await this.projectRepo.createVersion({
      terraformProjectId: project.id,
      generationId,
      versionNumber,
      specSnapshot: spec,
      moduleVersionsUsed: {},
      status: 'pending',
    });

    return version.id;
  }

  async execute(
    versionId: string,
    projectId: string,
    userId: string,
    generationId: string,
    projectName: string,
    cloudProvider: 'aws' | 'azure' | 'gcp',
    spec: InfrastructureSpecification,
  ): Promise<string> {
    this.logger.log(`Executing generation steps for version ${versionId}`);

    const version = await this.projectRepo.getVersion(versionId);
    if (!version) {
      throw new Error(`Terraform version ${versionId} not found`);
    }

    const versionNumber = version.versionNumber;

    // Helper for logging to DB and console
    const logStage = async (stage: string, level: 'info' | 'warning' | 'error', message: string, metadata?: any) => {
      this.logger.log(`[Stage: ${stage}] ${message}`);
      await this.projectRepo.log({
        terraformVersionId: versionId,
        stage,
        level,
        message,
        metadata,
      });
    };

    try {
      // 4. Provider Mapping
      await logStage('provider_mapping', 'info', `Mapping infrastructure specification to module selections`);
      const selections = this.variableMapper['providerMappingService']
        .getMapper(cloudProvider)
        .mapToModuleSelections(spec);

      // 5. Module Resolution and Sort
      await logStage('module_resolution', 'info', `Resolving and sorting ${selections.length} module selections`);
      const sortedModules = await this.selectorService.resolveAndSort(cloudProvider, selections);
      
      const moduleVersions: Record<string, string> = {};
      for (const m of sortedModules) {
        moduleVersions[`${m.provider}/${m.category}/${m.name}`] = m.version;
      }
      await this.projectRepo.updateVersion(versionId, {
        moduleVersionsUsed: moduleVersions,
      });

      // 6. Variable Mapping
      await logStage('variable_mapping', 'info', `Mapping specifications to HCL variable configurations`);
      const mappingResult = this.variableMapper.map(cloudProvider, spec, sortedModules, projectName);

      // 7. Template Rendering
      await logStage('template_rendering', 'info', `Rendering HCL template configurations`);
      const hasDatabase = sortedModules.some((m) => m.name === 'rds-postgresql');
      const rootFiles = {
        'main.tf': this.templateEngine.renderMain(
          projectName,
          versionNumber,
          generationId,
          hasDatabase,
          sortedModules,
          mappingResult.perModule,
        ),
        'variables.tf': this.templateEngine.renderVariables(mappingResult.rootVariables),
        'outputs.tf': this.templateEngine.renderOutputs(mappingResult.rootOutputs),
        'terraform.tfvars': this.templateEngine.renderTfvars(mappingResult.tfvarsValues),
        'versions.tf': this.templateEngine.renderVersions(hasDatabase),
      };

      // 8. File Builder
      await logStage('module_copy', 'info', `Writing root HCL files and copying curated child modules`);
      const generatedFiles = await this.fileBuilder.build(versionId, rootFiles, sortedModules);

      // Save files to DB
      await logStage('persistence', 'info', `Saving ${generatedFiles.length} generated files to repository database`);
      await this.projectRepo.saveFiles(
        generatedFiles.map((f) => ({
          terraformVersionId: versionId,
          filePath: f.filePath,
          fileType: f.fileType,
          content: f.content,
          checksum: f.checksum,
          sizeBytes: f.sizeBytes,
        })),
      );

      // Calculate total sizes
      const totalSizeBytes = generatedFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

      // 9. Validation Gate
      await logStage('validation', 'info', `Executing sandbox CLI validation gate`);
      const validationReport = await this.validator.validateProject(versionId);

      // Save validation results
      await this.projectRepo.saveValidationResult({
        terraformVersionId: versionId,
        tool: 'terraform_fmt',
        status: validationReport.fmtPassed ? 'pass' : 'warning',
        rawOutput: { output: validationReport.fmtOutput },
        summary: validationReport.fmtPassed ? 'Formatter ran successfully' : 'Formatter detected unformatted files',
      });

      await this.projectRepo.saveValidationResult({
        terraformVersionId: versionId,
        tool: 'terraform_validate',
        status: validationReport.validatePassed ? 'pass' : 'fail',
        rawOutput: validationReport.validateOutput,
        summary: validationReport.validatePassed
          ? 'Configuration successfully compiled and validated'
          : 'Validation failed',
      });

      // Update version & project completion
      const project = await this.projectRepo.findProjectByProjectId(projectId);
      const projectIdDb = project ? project.id : version.terraformProjectId;

      await this.projectRepo.updateVersion(versionId, {
        status: 'completed',
        validationPassed: validationReport.validatePassed,
        fileCount: generatedFiles.length,
        totalSizeBytes,
        completedAt: new Date(),
      });

      await this.projectRepo.updateProject(projectIdDb, {
        currentVersionId: versionId,
        status: 'completed',
      });

      await logStage('validation', 'info', `Terraform generation pipeline completed successfully. Validated: ${validationReport.validatePassed}`);

      return versionId;
    } catch (error: any) {
      this.logger.error(`Generation pipeline failed: ${error.message}`, error.stack);
      
      await logStage('persistence', 'error', `Generation failed: ${error.message}`, { stack: error.stack });

      const project = await this.projectRepo.findProjectByProjectId(projectId);
      const projectIdDb = project ? project.id : version.terraformProjectId;

      await this.projectRepo.updateVersion(versionId, {
        status: 'failed',
        completedAt: new Date(),
      });

      await this.projectRepo.updateProject(projectIdDb, {
        status: 'failed',
      });

      throw error;
    }
  }
}
