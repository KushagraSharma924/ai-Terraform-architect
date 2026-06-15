import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TerraformGeneratorService } from '../services/terraform-generator.service';
import { TerraformProjectRepository } from '../repositories/terraform-project.repository';
import { InfrastructureSpecification } from '@ata/shared-types';

export interface GenerateProjectDto {
  projectId: string;
  generationId: string;
  name: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  spec: InfrastructureSpecification;
}

@Controller('api/v1/terraform-projects')
@UseGuards(JwtAuthGuard)
export class TerraformProjectsController {
  constructor(
    private readonly generatorService: TerraformGeneratorService,
    private readonly projectRepo: TerraformProjectRepository,
    @InjectQueue('terraform-generation') private readonly generationQueue: Queue,
  ) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!body.projectId || !body.generationId || !body.name || !body.cloudProvider || !body.spec) {
      throw new BadRequestException('Missing required fields');
    }

    // 1. Initiate project / version in pending state
    const versionId = await this.generatorService.initiate(
      body.projectId,
      userId,
      body.generationId,
      body.name,
      body.cloudProvider,
      body.spec,
    );

    // 2. Queue the job for background execution
    await this.generationQueue.add('generate-project', {
      versionId,
      projectId: body.projectId,
      userId,
      generationId: body.generationId,
      name: body.name,
      cloudProvider: body.cloudProvider,
      spec: body.spec,
    });

    return { versionId, status: 'pending' };
  }

  @Get('project/:projectId/versions')
  async getProjectVersions(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    const project = await this.projectRepo.findProjectByProjectId(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.userId !== userId) {
      throw new UnauthorizedException('Access denied to this project');
    }
    return this.projectRepo.getProjectVersions(project.id);
  }

  @Get('version/:versionId')
  async getVersionDetails(
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const version = await this.projectRepo.getVersion(versionId);
    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Verify ownership of the parent project
    const project = await this.projectRepo.findProjectByGenerationId(version.generationId);
    if (project && project.userId !== userId) {
      throw new UnauthorizedException('Access denied to this project version');
    }

    const logs = await this.projectRepo.getLogs(versionId);
    const validation = await this.projectRepo.getValidationResults(versionId);

    return {
      version,
      logs,
      validation,
    };
  }

  @Get('version/:versionId/files')
  async getVersionFiles(
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const version = await this.projectRepo.getVersion(versionId);
    if (!version) {
      throw new NotFoundException('Version not found');
    }

    const files = await this.projectRepo.getFilesForVersion(versionId);
    return files.map((f) => ({
      id: f.id,
      filePath: f.filePath,
      fileType: f.fileType,
      sizeBytes: f.sizeBytes,
      checksum: f.checksum,
    }));
  }

  @Get('version/:versionId/file')
  async getVersionFile(
    @Param('versionId') versionId: string,
    @Query('path') filePath: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!filePath) {
      throw new BadRequestException('Path parameter is required');
    }

    const file = await this.projectRepo.getFileByPath(versionId, filePath);
    if (!file) {
      throw new NotFoundException(`File at ${filePath} not found`);
    }

    return {
      filePath: file.filePath,
      content: file.content,
      sizeBytes: file.sizeBytes,
    };
  }

  @Get('diff')
  async getDiff(
    @Query('fromVersionId') fromVersionId: string,
    @Query('toVersionId') toVersionId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!fromVersionId || !toVersionId) {
      throw new BadRequestException('Both fromVersionId and toVersionId are required');
    }

    const fromFiles = await this.projectRepo.getFilesForVersion(fromVersionId);
    const toFiles = await this.projectRepo.getFilesForVersion(toVersionId);

    const diffs: {
      filePath: string;
      status: 'added' | 'modified' | 'deleted' | 'unchanged';
      fromContent: string;
      toContent: string;
    }[] = [];

    const fromMap = new Map(fromFiles.map((f) => [f.filePath, f.content]));
    const toMap = new Map(toFiles.map((f) => [f.filePath, f.content]));

    const allPaths = new Set([...fromMap.keys(), ...toMap.keys()]);
    for (const p of allPaths) {
      const fromContent = fromMap.get(p);
      const toContent = toMap.get(p);

      if (fromContent !== undefined && toContent === undefined) {
        diffs.push({ filePath: p, status: 'deleted', fromContent, toContent: '' });
      } else if (fromContent === undefined && toContent !== undefined) {
        diffs.push({ filePath: p, status: 'added', fromContent: '', toContent });
      } else if (fromContent !== toContent) {
        diffs.push({ filePath: p, status: 'modified', fromContent: fromContent!, toContent: toContent! });
      } else {
        diffs.push({ filePath: p, status: 'unchanged', fromContent: fromContent!, toContent: toContent! });
      }
    }

    return diffs;
  }
}
