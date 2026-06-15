import { Injectable } from '@nestjs/common';

const INFRASTRUCTURE_SPEC_SCHEMA = {
  $id: 'https://ata.dev/schemas/infrastructure-specification/1.0.json',
  type: 'object',
  required: ['schemaVersion', 'cloudProvider', 'applicationType', 'services'],
  additionalProperties: false,
  properties: {
    schemaVersion: { type: 'string', const: '1.0' },
    cloudProvider: { type: 'string', enum: ['aws', 'azure', 'gcp'] },
    applicationType: {
      type: 'string',
      enum: ['nodejs', 'python', 'java', 'go', 'php', 'static', 'mern', 'other'],
    },
    architecturePattern: {
      type: 'string',
      enum: ['single-tier', 'two-tier', 'three-tier', 'serverless', 'microservices'],
      default: 'two-tier',
    },
    services: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'ec2',
          'alb',
          'nlb',
          'rds',
          'vpc',
          'autoscaling',
          's3',
          'ecs',
          'eks',
          'lambda',
          'documentdb',
          'cloudfront',
          'route53',
          'iam',
          'elasticache',
        ],
      },
      minItems: 1,
    },
    compute: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['ec2', 'ecs', 'eks', 'lambda', 'none'] },
        instanceCount: { type: 'integer', minimum: 0, maximum: 50 },
        instanceType: { type: 'string' },
        autoScaling: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            minInstances: { type: 'integer', minimum: 0 },
            maxInstances: { type: 'integer', minimum: 1 },
            targetCpuUtilization: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
      },
    },
    loadBalancer: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['alb', 'nlb', 'none'] },
        scheme: { type: 'string', enum: ['internet-facing', 'internal'] },
        healthCheckPath: { type: 'string' },
      },
    },
    database: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['postgresql', 'mysql', 'mongodb', 'documentdb', 'none'] },
        engineVersion: { type: ['string', 'null'] },
        multiAz: { type: 'boolean' },
        storageGb: { type: 'integer', minimum: 5 },
      },
    },
    networking: {
      type: 'object',
      properties: {
        vpcCidr: { type: 'string', pattern: '^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$' },
        privateSubnets: { type: 'boolean' },
        publicSubnets: { type: 'boolean' },
        natGateway: { type: 'boolean' },
        availabilityZones: { type: 'integer', minimum: 1, maximum: 6 },
      },
    },
    security: {
      type: 'object',
      properties: {
        securityGroups: { type: 'array', items: { type: 'string' } },
        encryptionAtRest: { type: 'boolean' },
      },
    },
    storage: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['s3'] },
          purpose: { type: 'string' },
        },
      },
    },
    estimatedMonthlyTraffic: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
    tags: { type: 'object', additionalProperties: { type: 'string' } },
    ambiguities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'reason', 'confidence'],
        properties: {
          field: { type: 'string' },
          reason: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
    confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
  },
};

@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(): string {
    return `ROLE: You are an AWS infrastructure requirements parser. Convert the user's natural language description into a JSON object matching the InfrastructureSpecification schema (v1.0) below. Output ONLY valid JSON — no markdown, no explanation.

SCHEMA:
${JSON.stringify(INFRASTRUCTURE_SPEC_SCHEMA, null, 2)}

RULES:
- Use only enum values listed in the schema for "services", "applicationType", etc.
- If the user does not specify a value, choose a sensible secure default and add an entry to "ambiguities" explaining the default and your confidence.
- Security-sensitive fields (encryptionAtRest, privateSubnets) must default to secure values (true) unless the user explicitly requests otherwise.
- "services" array must include an entry for every resource type referenced elsewhere in the output.
- Compute confidenceScore: if you make many assumptions, it should be lower (e.g. 0.5 - 0.8). If everything is explicitly stated, it should be 1.0.

FEW-SHOT EXAMPLES:
1. Input: "I want a simple nodejs app running on two servers with a postgres database"
   Output: {
     "schemaVersion": "1.0",
     "cloudProvider": "aws",
     "applicationType": "nodejs",
     "architecturePattern": "two-tier",
     "services": ["ec2", "rds", "vpc"],
     "compute": {
       "type": "ec2",
       "instanceCount": 2,
       "instanceType": "t3.micro",
       "autoScaling": { "enabled": false, "minInstances": 2, "maxInstances": 2 }
     },
     "database": {
       "type": "postgresql",
       "engineVersion": null,
       "multiAz": false,
       "storageGb": 20
     },
     "networking": {
       "vpcCidr": "10.0.0.0/16",
       "privateSubnets": true,
       "publicSubnets": true,
       "natGateway": false,
       "availabilityZones": 2
     },
     "security": {
       "securityGroups": ["web", "db"],
       "encryptionAtRest": true
     },
     "ambiguities": [
       { "field": "compute.instanceType", "reason": "Defaulted to t3.micro cost-effective instance", "confidence": "medium" },
       { "field": "database.storageGb", "reason": "Defaulted to 20GB storage", "confidence": "low" }
     ],
     "confidenceScore": 0.85
   }`;
  }

  buildRefinementUserPrompt(
    promptText: string,
    previousSpec: any,
  ): string {
    return `PREVIOUS SPECIFICATION:
${JSON.stringify(previousSpec, null, 2)}

USER REFINEMENT REQUEST:
${promptText}

Apply only the changes implied by the refinement request. Preserve all other fields from the previous specification unless the refinement explicitly contradicts them. Update "ambiguities" to reflect only newly-introduced uncertainties.`;
  }

  buildCorrectiveUserPrompt(errors: string[]): string {
    return `Your previous response failed validation with these errors:
${errors.join('\n')}

Return a corrected JSON object that resolves all listed errors, conforming strictly to the schema. Output ONLY the corrected JSON.`;
  }
}
export { INFRASTRUCTURE_SPEC_SCHEMA };
