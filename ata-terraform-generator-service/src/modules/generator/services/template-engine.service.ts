import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import {
  VERSIONS_TEMPLATE,
  VARIABLES_TEMPLATE,
  OUTPUTS_TEMPLATE,
  MAIN_TEMPLATE,
  TFVARS_TEMPLATE,
} from '../templates';
import { RootVariableDef, RootOutputDef, ResolvedModule } from '../../provider-mapping/interfaces/provider-mapper.interface';

export function formatToHcl(val: any): string {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  if (typeof val === 'string') {
    // Check if it's an HCL expression reference (starts with var., module., random_password.)
    const expressionRegex = /^(var\.|module\.|random_password\.)/;
    if (expressionRegex.test(val)) {
      return val;
    }
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(formatToHcl).join(', ') + ']';
  }
  if (typeof val === 'object') {
    const parts = Object.entries(val).map(([k, v]) => `${k} = ${formatToHcl(v)}`);
    return '{\n    ' + parts.join('\n    ') + '\n  }';
  }
  return JSON.stringify(val);
}

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);

  constructor() {
    // Register custom Handlebars helpers if needed
    try {
      Handlebars.registerHelper('exists', (value) => {
        return value !== undefined && value !== null;
      });
      Handlebars.registerHelper('formatDefault', (value) => {
        return formatToHcl(value);
      });
    } catch (e) {
      // Ignore helper already registered errors during hot reload
    }
  }

  renderVersions(hasDatabase: boolean): string {
    const template = Handlebars.compile(VERSIONS_TEMPLATE);
    return template({ hasDatabase });
  }

  renderVariables(variables: RootVariableDef[]): string {
    const template = Handlebars.compile(VARIABLES_TEMPLATE);
    const mapped = variables.map((v) => ({
      name: v.name,
      type: v.type,
      hasDefault: v.default !== undefined,
      defaultValue: formatToHcl(v.default),
      description: v.description,
    }));
    return template({ variables: mapped });
  }

  renderOutputs(outputs: RootOutputDef[]): string {
    const template = Handlebars.compile(OUTPUTS_TEMPLATE);
    const mapped = outputs.map((o) => ({
      name: o.name,
      value: o.value, // Outputs reference modules, e.g. module.alb.dns_name
      description: o.description,
    }));
    return template({ outputs: mapped });
  }

  renderMain(
    projectName: string,
    versionNumber: number,
    generationId: string,
    hasDatabase: boolean,
    modules: ResolvedModule[],
    perModuleVars: Record<string, Record<string, any>>,
  ): string {
    const template = Handlebars.compile(MAIN_TEMPLATE);
    const mappedModules = modules.map((m) => {
      const moduleKey = m.name;
      // Convert hyphens to underscores for terraform module name blocks, e.g. module "security_groups"
      const moduleBlockName = m.name.replace('-', '_');
      const variablesObj = perModuleVars[moduleKey] || {};
      const variables = Object.entries(variablesObj).map(([key, value]) => ({
        key,
        value: formatToHcl(value),
      }));

      return {
        moduleName: moduleBlockName,
        sourcePath: m.sourcePath,
        variables,
      };
    });

    return template({
      projectName,
      versionNumber,
      generationId,
      hasDatabase,
      modules: mappedModules,
    });
  }

  renderTfvars(tfvarsValues: Record<string, any>): string {
    const template = Handlebars.compile(TFVARS_TEMPLATE);
    const tfvars = Object.entries(tfvarsValues).map(([key, value]) => ({
      key,
      value: formatToHcl(value),
    }));
    return template({ tfvars });
  }
}
