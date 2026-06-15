import { Injectable, Logger } from '@nestjs/common';
import { ModuleRegistryRepository } from '../repositories/module-registry.repository';
import { ResolvedModule } from '../../provider-mapping/interfaces/provider-mapper.interface';

@Injectable()
export class ModuleSelectorService {
  private readonly logger = new Logger(ModuleSelectorService.name);

  constructor(private readonly registryRepo: ModuleRegistryRepository) {}

  async resolveAndSort(
    provider: 'aws' | 'azure' | 'gcp',
    selections: { category: string; name: string }[],
  ): Promise<ResolvedModule[]> {
    this.logger.log(`Resolving and sorting ${selections.length} modules for provider ${provider}`);
    const resolved: ResolvedModule[] = [];

    for (const sel of selections) {
      const match = await this.registryRepo.findActive(provider, sel.category, sel.name);
      if (!match) {
        throw new Error(`Module ${provider}/${sel.category}/${sel.name} not found or inactive in registry.`);
      }
      resolved.push({
        id: match.id,
        provider: match.provider as 'aws' | 'azure' | 'gcp',
        category: match.category,
        name: match.name,
        version: match.version,
        sourcePath: match.sourcePath,
        requiredVariables: match.requiredVariables as string[],
        optionalVariables: match.optionalVariables as string[] | null,
        outputs: match.outputs as string[],
        dependsOn: match.dependsOn as string[] | null,
      });
    }

    // Topological Sort (DFS)
    const sorted: ResolvedModule[] = [];
    const visited = new Set<string>();
    const tempVisited = new Set<string>();

    const visit = (modName: string) => {
      if (tempVisited.has(modName)) {
        throw new Error(`Circular dependency detected involving module: ${modName}`);
      }
      if (!visited.has(modName)) {
        tempVisited.add(modName);
        const mod = resolved.find((m) => m.name === modName);
        if (mod && mod.dependsOn) {
          for (const dep of mod.dependsOn) {
            // Normalize dependency checking (e.g. security-groups vs security_groups)
            const depMatch = resolved.find((m) => m.name === dep || m.name.replace('-', '_') === dep.replace('-', '_'));
            if (depMatch) {
              visit(depMatch.name);
            }
          }
        }
        tempVisited.delete(modName);
        visited.add(modName);
        if (mod) {
          sorted.push(mod);
        }
      }
    };

    for (const mod of resolved) {
      if (!visited.has(mod.name)) {
        visit(mod.name);
      }
    }

    return sorted;
  }
}
