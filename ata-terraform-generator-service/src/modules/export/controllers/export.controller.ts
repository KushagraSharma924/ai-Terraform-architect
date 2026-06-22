import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ArtifactService } from '../services/artifact.service';
import { TerraformProjectRepository } from '../../generator/repositories/terraform-project.repository';

@Controller('exports')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly artifactService: ArtifactService,
    private readonly projectRepo: TerraformProjectRepository,
  ) {}

  /** Verifies the version exists and belongs to a project owned by the user. */
  private async assertVersionOwnership(versionId: string, userId: string) {
    const version = await this.projectRepo.getVersion(versionId);
    if (!version) throw new NotFoundException('Version not found');
    const project = await this.projectRepo.findProjectByGenerationId(version.generationId);
    if (project && project.userId !== userId) {
      throw new UnauthorizedException('Access denied to this project version');
    }
    return version;
  }

  /** Request an export build. Returns 202 with the artifact id to poll. */
  @Post('version/:versionId')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestExport(
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
    @Query('type') type = 'zip',
  ) {
    await this.assertVersionOwnership(versionId, userId);
    const { artifact, cached } = await this.artifactService.requestExport(versionId, type);
    return {
      artifactId: artifact.id,
      status: artifact.status,
      type: artifact.type,
      cached,
    };
  }

  @Get('version/:versionId')
  async listForVersion(
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.assertVersionOwnership(versionId, userId);
    return this.artifactService.listForVersion(versionId);
  }

  /** Poll artifact status. When ready, exposes the download path. */
  @Get(':artifactId')
  async getStatus(
    @Param('artifactId') artifactId: string,
    @CurrentUser('id') userId: string,
  ) {
    const artifact = await this.artifactService.getArtifact(artifactId);
    await this.assertVersionOwnership(artifact.terraformVersionId, userId);
    return {
      id: artifact.id,
      status: artifact.status,
      type: artifact.type,
      fileName: artifact.fileName,
      sizeBytes: artifact.sizeBytes,
      contentHash: artifact.contentHash,
      downloadCount: artifact.downloadCount,
      error: artifact.error,
      expiresAt: artifact.expiresAt,
      downloadUrl: artifact.status === 'ready' ? `/exports/${artifact.id}/download` : null,
    };
  }

  @Get(':artifactId/download')
  async download(
    @Param('artifactId') artifactId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const artifact = await this.artifactService.getArtifact(artifactId);
    await this.assertVersionOwnership(artifact.terraformVersionId, userId);

    const { fileName, bytes, contentHash } = await this.artifactService.download(artifactId);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(bytes.length),
      'X-Content-SHA256': contentHash,
    });
    res.send(bytes);
  }
}
