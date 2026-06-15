import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import {
  terraformProjects,
  terraformVersions,
  terraformFiles,
  generationLogs,
  validationResults,
} from '../../../database/schema';

@Injectable()
export class TerraformProjectRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async findProjectByGenerationId(generationId: string) {
    const [project] = await this.db
      .select()
      .from(terraformProjects)
      .where(eq(terraformProjects.generationId, generationId))
      .limit(1);
    return project || null;
  }

  async findProjectByProjectId(projectId: string) {
    const [project] = await this.db
      .select()
      .from(terraformProjects)
      .where(eq(terraformProjects.projectId, projectId))
      .limit(1);
    return project || null;
  }

  async createProject(data: typeof terraformProjects.$inferInsert) {
    const [project] = await this.db.insert(terraformProjects).values(data).returning();
    return project;
  }

  async updateProject(id: string, data: Partial<typeof terraformProjects.$inferInsert>) {
    const [project] = await this.db
      .update(terraformProjects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(terraformProjects.id, id))
      .returning();
    return project;
  }

  async getLatestVersionNumber(projectId: string): Promise<number> {
    const [latest] = await this.db
      .select({ versionNumber: terraformVersions.versionNumber })
      .from(terraformVersions)
      .where(eq(terraformVersions.terraformProjectId, projectId))
      .orderBy(desc(terraformVersions.versionNumber))
      .limit(1);
    return latest ? latest.versionNumber : 0;
  }

  async createVersion(data: typeof terraformVersions.$inferInsert) {
    const [version] = await this.db.insert(terraformVersions).values(data).returning();
    return version;
  }

  async updateVersion(id: string, data: Partial<typeof terraformVersions.$inferInsert>) {
    const [version] = await this.db
      .update(terraformVersions)
      .set(data)
      .where(eq(terraformVersions.id, id))
      .returning();
    return version;
  }

  async getVersion(id: string) {
    const [version] = await this.db
      .select()
      .from(terraformVersions)
      .where(eq(terraformVersions.id, id))
      .limit(1);
    return version || null;
  }

  async getProjectVersions(projectId: string) {
    return this.db
      .select()
      .from(terraformVersions)
      .where(eq(terraformVersions.terraformProjectId, projectId))
      .orderBy(desc(terraformVersions.versionNumber));
  }

  async saveFiles(files: (typeof terraformFiles.$inferInsert)[]) {
    if (files.length === 0) return;
    await this.db.insert(terraformFiles).values(files);
  }

  async getFilesForVersion(versionId: string) {
    return this.db
      .select()
      .from(terraformFiles)
      .where(eq(terraformFiles.terraformVersionId, versionId));
  }

  async getFileByPath(versionId: string, filePath: string) {
    const [file] = await this.db
      .select()
      .from(terraformFiles)
      .where(
        and(
          eq(terraformFiles.terraformVersionId, versionId),
          eq(terraformFiles.filePath, filePath),
        ),
      )
      .limit(1);
    return file || null;
  }

  async log(data: typeof generationLogs.$inferInsert) {
    await this.db.insert(generationLogs).values(data);
  }

  async getLogs(versionId: string) {
    return this.db
      .select()
      .from(generationLogs)
      .where(eq(generationLogs.terraformVersionId, versionId))
      .orderBy(generationLogs.createdAt);
  }

  async saveValidationResult(data: typeof validationResults.$inferInsert) {
    const [result] = await this.db.insert(validationResults).values(data).returning();
    return result;
  }

  async getValidationResults(versionId: string) {
    return this.db
      .select()
      .from(validationResults)
      .where(eq(validationResults.terraformVersionId, versionId));
  }
}
