import { AwsProviderMapper } from './aws-provider.mapper';
import { InfrastructureSpecification } from '@ata/shared-types';

describe('AwsProviderMapper', () => {
  let mapper: AwsProviderMapper;

  beforeEach(() => {
    mapper = new AwsProviderMapper();
  });

  it('should map core modules (vpc, security-groups) by default', () => {
    const spec: InfrastructureSpecification = {
      schemaVersion: '1.0',
      cloudProvider: 'aws',
      applicationType: 'nodejs',
      ambiguities: [],
      confidenceScore: 1.0,
      services: [],
    };
    const selections = mapper.mapToModuleSelections(spec);
    expect(selections).toContainEqual({ provider: 'aws', category: 'networking', name: 'vpc' });
    expect(selections).toContainEqual({ provider: 'aws', category: 'security', name: 'security-groups' });
  });

  it('should include database and compute in module selections when present in spec', () => {
    const spec: InfrastructureSpecification = {
      schemaVersion: '1.0',
      cloudProvider: 'aws',
      applicationType: 'nodejs',
      ambiguities: [],
      confidenceScore: 1.0,
      services: [],
      compute: {
        type: 'ecs',
        instanceCount: 2,
      },
      database: {
        type: 'postgresql',
        storageGb: 20,
      },
    };
    const selections = mapper.mapToModuleSelections(spec);
    expect(selections).toContainEqual({ provider: 'aws', category: 'compute', name: 'ecs-fargate' });
    expect(selections).toContainEqual({ provider: 'aws', category: 'database', name: 'rds-postgresql' });
  });

  it('should map variables correctly', () => {
    const spec: InfrastructureSpecification = {
      schemaVersion: '1.0',
      cloudProvider: 'aws',
      applicationType: 'nodejs',
      ambiguities: [],
      confidenceScore: 1.0,
      services: [],
      networking: {
        vpcCidr: '10.1.0.0/16',
        privateSubnets: true,
      },
      database: {
        type: 'postgresql',
        storageGb: 200,
      },
    };

    const modules = [
      { id: '1', provider: 'aws' as const, category: 'networking', name: 'vpc', version: '1.0.0', sourcePath: 'aws/networking/vpc', requiredVariables: [], optionalVariables: [], outputs: [], dependsOn: [] },
      { id: '2', provider: 'aws' as const, category: 'database', name: 'rds-postgresql', version: '1.0.0', sourcePath: 'aws/database/rds-postgresql', requiredVariables: [], optionalVariables: [], outputs: [], dependsOn: [] },
    ];

    const result = mapper.mapVariables(spec, modules, 'TestProj');
    expect(result.perModule.vpc.cidr_block).toBe('10.1.0.0/16');
    expect(result.perModule['rds-postgresql'].allocated_storage).toBe(200);
    expect(result.perModule['rds-postgresql'].instance_class).toBe('db.t3.medium');
    expect(result.tfvarsValues.vpc_cidr).toBe('10.1.0.0/16');
  });
});
