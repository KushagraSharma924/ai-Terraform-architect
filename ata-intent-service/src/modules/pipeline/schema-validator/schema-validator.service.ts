import { Injectable, BadRequestException } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { INFRASTRUCTURE_SPEC_SCHEMA } from '../prompt-builder/prompt-builder.service';

@Injectable()
export class SchemaValidatorService {
  private readonly ajv: Ajv;
  private readonly validateSpec: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, useDefaults: true });
    addFormats(this.ajv);
    this.validateSpec = this.ajv.compile(INFRASTRUCTURE_SPEC_SCHEMA);
  }

  validate(spec: any): { valid: boolean; errors: string[] } {
    if (!spec || typeof spec !== 'object') {
      return { valid: false, errors: ['Specification is not a valid JSON object'] };
    }

    const ajvValid = this.validateSpec(spec);
    const errors: string[] = [];

    if (!ajvValid && this.validateSpec.errors) {
      for (const err of this.validateSpec.errors) {
        errors.push(`Field "${err.instancePath}" ${err.message}`);
      }
    }

    // Cross-field consistency rules
    if (spec.compute?.type && spec.compute.type !== 'none') {
      if (!spec.services?.includes(spec.compute.type)) {
        errors.push(`Cross-field error: services list must contain "${spec.compute.type}" since compute.type is "${spec.compute.type}"`);
      }
    }

    if (spec.loadBalancer?.type && spec.loadBalancer.type !== 'none') {
      if (!spec.services?.includes(spec.loadBalancer.type)) {
        errors.push(`Cross-field error: services list must contain "${spec.loadBalancer.type}" since loadBalancer.type is "${spec.loadBalancer.type}"`);
      }
    }

    if (spec.database?.type && spec.database.type !== 'none') {
      let matchedDbService = false;
      if (spec.database.type === 'postgresql' && spec.services?.includes('rds')) matchedDbService = true;
      if (spec.database.type === 'mysql' && spec.services?.includes('rds')) matchedDbService = true;
      if (spec.database.type === 'mongodb' && spec.services?.includes('documentdb')) matchedDbService = true;
      if (spec.database.type === 'documentdb' && spec.services?.includes('documentdb')) matchedDbService = true;

      if (!matchedDbService) {
        errors.push(`Cross-field error: services list must contain matching service (e.g. "rds" for "postgresql"/"mysql", or "documentdb" for "mongodb"/"documentdb") since database.type is "${spec.database.type}"`);
      }
    }

    // Reverse check: every entry in `services` must be referenced by some top-level config,
    // OR be in an allow-list of "standalone" services (s3, vpc, route53, cloudfront, iam)
    if (spec.services && Array.isArray(spec.services)) {
      const standaloneServices = new Set(['vpc', 's3', 'route53', 'cloudfront', 'iam', 'elasticache']);
      const referencedServices = new Set([
        spec.compute?.type,
        spec.loadBalancer?.type,
        spec.database?.type === 'postgresql' || spec.database?.type === 'mysql' ? 'rds' : spec.database?.type,
        spec.compute?.autoScaling?.enabled ? 'autoscaling' : null,
      ].filter(Boolean));

      for (const svc of spec.services) {
        if (!referencedServices.has(svc) && !standaloneServices.has(svc)) {
          errors.push(`Cross-field error: "${svc}" is listed in services but not referenced by any config section`);
        }
      }
    }

    // Instance count validation
    if (spec.compute?.type && ['ec2', 'ecs', 'eks'].includes(spec.compute.type)) {
      if (!spec.compute.instanceCount || spec.compute.instanceCount < 1) {
        errors.push(`Cross-field error: compute.instanceCount must be >= 1 when compute.type is "${spec.compute.type}"`);
      }
    } else if (spec.compute?.type === 'lambda') {
      if (spec.compute.instanceCount && spec.compute.instanceCount !== 0) {
        errors.push('Cross-field error: compute.instanceCount must be 0 or absent when compute.type is "lambda"');
      }
    }

    // AutoScaling check
    if (spec.compute?.autoScaling?.enabled) {
      const min = spec.compute.autoScaling.minInstances ?? 0;
      const max = spec.compute.autoScaling.maxInstances ?? 0;
      if (min > max) {
        errors.push('Cross-field error: autoScaling.minInstances cannot exceed autoScaling.maxInstances');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  autoRepair(spec: any): any {
    if (!spec || typeof spec !== 'object') return spec;
    
    const repaired = {
      ...spec,
      services: spec.services ? [...spec.services] : [],
    };

    // Remove orphaned ec2 if compute.type !== 'ec2'
    if (repaired.compute?.type !== 'ec2') {
      repaired.services = repaired.services.filter((s: string) => s !== 'ec2');
    }
    // If compute.type is ecs/eks, strip EC2-shaped fields
    if (repaired.compute?.type === 'ecs' || repaired.compute?.type === 'eks') {
      if (repaired.compute) {
        const computeCopy = { ...repaired.compute };
        delete (computeCopy as any).instanceType;
        repaired.compute = computeCopy;
      }
    }

    // Auto-repair missing service enums
    if (repaired.compute?.type && repaired.compute.type !== 'none') {
      if (!repaired.services.includes(repaired.compute.type)) {
        repaired.services.push(repaired.compute.type);
      }
    }

    if (repaired.loadBalancer?.type && repaired.loadBalancer.type !== 'none') {
      if (!repaired.services.includes(repaired.loadBalancer.type)) {
        repaired.services.push(repaired.loadBalancer.type);
      }
    }

    if (repaired.database?.type && repaired.database.type !== 'none') {
      if (['postgresql', 'mysql'].includes(repaired.database.type) && !repaired.services.includes('rds')) {
        repaired.services.push('rds');
      }
      if (['mongodb', 'documentdb'].includes(repaired.database.type) && !repaired.services.includes('documentdb')) {
        repaired.services.push('documentdb');
      }
    }

    return repaired;
  }
}
