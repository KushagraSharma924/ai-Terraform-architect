import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, count } from 'drizzle-orm';
import { projects } from '../../database/schema';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    private readonly workspaces: WorkspacesService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    // Editor+ can create projects
    await this.workspaces.requireRole(dto.workspaceId, userId, 'editor');

    // Enforce unique name within workspace
    const [existing] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, dto.workspaceId), eq(projects.name, dto.name)))
      .limit(1);

    if (existing) throw new ConflictException({ error: 'PROJECT_NAME_EXISTS' });

    const [project] = await this.db
      .insert(projects)
      .values({
        workspaceId: dto.workspaceId,
        name: dto.name,
        description: dto.description,
        createdBy: userId,
      })
      .returning();

    return project;
  }

  async findAllInWorkspace(workspaceId: string, userId: string, page = 1, limit = 20) {
    await this.workspaces.requireRole(workspaceId, userId, 'viewer');

    const offset = (page - 1) * limit;
    const data = await this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  async findOne(projectId: string, userId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundException({ error: 'PROJECT_NOT_FOUND' });
    await this.workspaces.requireRole(project.workspaceId, userId, 'viewer');

    return project;
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundException({ error: 'PROJECT_NOT_FOUND' });
    await this.workspaces.requireRole(project.workspaceId, userId, 'editor');

    const [updated] = await this.db
      .update(projects)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    return updated;
  }

  async remove(projectId: string, userId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new NotFoundException({ error: 'PROJECT_NOT_FOUND' });
    await this.workspaces.requireRole(project.workspaceId, userId, 'editor');

    await this.db.delete(projects).where(eq(projects.id, projectId));
  }
}
