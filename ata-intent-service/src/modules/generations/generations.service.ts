import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { generations } from '../../database/schema';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { RefineGenerationDto } from './dto/refine-generation.dto';
import { InputValidatorService } from '../pipeline/input-validator/input-validator.service';
import { ProjectServiceClient } from '../../common/clients/project-service.client';
import { IntentGenerationProducer } from '../queue/producers/intent-generation.producer';
import { computePromptHash } from '../../common/utils/prompt-hash.util';

@Injectable()
export class GenerationsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly inputValidator: InputValidatorService,
    private readonly projectClient: ProjectServiceClient,
    private readonly queueProducer: IntentGenerationProducer,
  ) {}

  async create(userId: string, dto: CreateGenerationDto) {
    // 1. Validate prompt
    this.inputValidator.validate(dto.prompt);

    // 2. Check usage quota
    const quota = await this.projectClient.getQuota(userId);
    if (quota.generationsUsed >= quota.generationsLimit) {
      throw new ForbiddenException({
        error: 'QUOTA_EXCEEDED',
        message: 'Your monthly generation quota has been exceeded.',
      });
    }

    // 3. Compute prompt hash
    const promptHash = computePromptHash(dto.prompt, '1.0', dto.cloudProviderHint || 'aws');

    // 4. Create pending generation record
    const [inserted] = await this.db
      .insert(generations)
      .values({
        projectId: dto.projectId,
        userId,
        promptText: dto.prompt,
        promptHash,
        status: 'pending',
        cloudProviderHint: dto.cloudProviderHint || 'aws',
        llmProvider: dto.provider,
        versionNumber: 1,
      })
      .returning();

    // 5. Enqueue parsing job
    const jobId = await this.queueProducer.enqueueParseJob(inserted.id, userId);

    return {
      generationId: inserted.id,
      jobId,
      status: 'pending',
    };
  }

  async refine(userId: string, generationId: string, dto: RefineGenerationDto) {
    // 1. Validate refinement prompt
    if (!dto.prompt || dto.prompt.trim().length < 5) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Refinement prompt must be at least 5 characters',
      });
    }

    // 2. Retrieve parent generation
    const [parent] = await this.db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!parent) {
      throw new NotFoundException({ error: 'GENERATION_NOT_FOUND', message: 'Parent generation not found' });
    }

    if (parent.status === 'failed') {
      throw new ConflictException({
        error: 'CANNOT_REFINE_FAILED_GENERATION',
        message: 'Cannot refine a failed generation',
      });
    }

    // 3. Check quota
    const quota = await this.projectClient.getQuota(userId);
    if (quota.generationsUsed >= quota.generationsLimit) {
      throw new ForbiddenException({
        error: 'QUOTA_EXCEEDED',
        message: 'Your monthly generation quota has been exceeded.',
      });
    }

    // 4. Create refinement record
    const promptHash = computePromptHash(dto.prompt, '1.0', parent.cloudProviderHint || 'aws');
    const nextVersion = (parent.versionNumber || 1) + 1;

    const [inserted] = await this.db
      .insert(generations)
      .values({
        projectId: parent.projectId,
        userId,
        parentGenerationId: parent.id,
        promptText: dto.prompt,
        promptHash,
        status: 'pending',
        cloudProviderHint: parent.cloudProviderHint || 'aws',
        llmProvider: dto.provider || parent.llmProvider,
        versionNumber: nextVersion,
      })
      .returning();

    // 5. Enqueue parsing job
    const jobId = await this.queueProducer.enqueueParseJob(inserted.id, userId);

    return {
      generationId: inserted.id,
      jobId,
      parentGenerationId: parent.id,
      status: 'pending',
    };
  }

  async findById(userId: string, generationId: string) {
    const [record] = await this.db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!record) {
      throw new NotFoundException({ error: 'GENERATION_NOT_FOUND', message: 'Generation not found' });
    }

    // Verify ownership
    if (record.userId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'You do not have access to this generation' });
    }

    return record;
  }

  async findByProject(userId: string, projectId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const rows = await this.db
      .select()
      .from(generations)
      .where(and(eq(generations.projectId, projectId), eq(generations.userId, userId)))
      .orderBy(desc(generations.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      versionNumber: r.versionNumber,
      status: r.status,
      promptExcerpt: r.promptText.substring(0, 100),
      confidenceScore: r.confidenceScore,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getStatus(generationId: string) {
    const [record] = await this.db
      .select({
        status: generations.status,
        retryCount: generations.retryCount,
        completedAt: generations.completedAt,
        errorCode: generations.errorCode,
        errorMessage: generations.errorMessage,
      })
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!record) {
      throw new NotFoundException({ error: 'GENERATION_NOT_FOUND', message: 'Generation not found' });
    }

    return record;
  }

  async delete(userId: string, generationId: string) {
    const [record] = await this.db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!record) {
      throw new NotFoundException({ error: 'GENERATION_NOT_FOUND', message: 'Generation not found' });
    }

    if (record.userId !== userId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Only the creator can delete this generation' });
    }

    await this.db.delete(generations).where(eq(generations.id, generationId));
  }
}
