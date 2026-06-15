import { Injectable } from '@nestjs/common';
import { InjectDrizzle, DRIZZLE_TOKEN } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { moduleRegistry } from '../../../database/schema';

@Injectable()
export class ModuleRegistryRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async upsert(data: any) {
    // Check if version exists
    const [existing] = await this.db
      .select()
      .from(moduleRegistry)
      .where(
        and(
          eq(moduleRegistry.provider, data.provider),
          eq(moduleRegistry.category, data.category),
          eq(moduleRegistry.name, data.name),
          eq(moduleRegistry.version, data.version)
        )
      )
      .limit(1);

    if (existing) {
      await this.db
        .update(moduleRegistry)
        .set(data)
        .where(eq(moduleRegistry.id, existing.id));
      return existing.id;
    } else {
      const [inserted] = await this.db.insert(moduleRegistry).values(data).returning();
      return inserted.id;
    }
  }

  async findActive(provider: string, category: string, name: string) {
    const [match] = await this.db
      .select()
      .from(moduleRegistry)
      .where(
        and(
          eq(moduleRegistry.provider, provider),
          eq(moduleRegistry.category, category),
          eq(moduleRegistry.name, name),
          eq(moduleRegistry.status, 'active')
        )
      )
      .limit(1);
    return match || null;
  }

  async findAllActive(provider: string) {
    return this.db
      .select()
      .from(moduleRegistry)
      .where(
        and(
          eq(moduleRegistry.provider, provider),
          eq(moduleRegistry.status, 'active')
        )
      );
  }
}
