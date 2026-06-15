import { Injectable } from '@nestjs/common';
import { InfrastructureSpecification } from '@ata/shared-types';
import {
  ProviderMapper,
  ModuleSelection,
  ResolvedModule,
  ProviderMappingResult,
  RootVariableDef,
  RootOutputDef,
} from '../interfaces/provider-mapper.interface';

@Injectable()
export class AwsProviderMapper implements ProviderMapper {
  readonly provider = 'aws' as const;

  mapToModuleSelections(spec: InfrastructureSpecification): ModuleSelection[] {
    const selections: ModuleSelection[] = [];

    // All specs require vpc
    selections.push({ provider: 'aws', category: 'networking', name: 'vpc' });

    // All specs require security groups
    selections.push({ provider: 'aws', category: 'security', name: 'security-groups' });

    // Check load balancer
    if (spec.loadBalancer && spec.loadBalancer.type === 'alb') {
      selections.push({ provider: 'aws', category: 'loadbalancing', name: 'alb' });
    }

    // Check compute
    if (spec.compute) {
      if (spec.compute.type === 'ec2') {
        selections.push({ provider: 'aws', category: 'compute', name: 'ec2-asg' });
      } else if (spec.compute.type === 'ecs') {
        selections.push({ provider: 'aws', category: 'compute', name: 'ecs-fargate' });
      }
    }

    // Check database
    if (spec.database && spec.database.type === 'postgresql') {
      selections.push({ provider: 'aws', category: 'database', name: 'rds-postgresql' });
    }

    return selections;
  }

  mapVariables(
    spec: InfrastructureSpecification,
    modules: ResolvedModule[],
    projectName: string,
  ): ProviderMappingResult {
    const perModule: Record<string, Record<string, any>> = {};
    const rootVariables: RootVariableDef[] = [];
    const rootOutputs: RootOutputDef[] = [];
    const tfvarsValues: Record<string, any> = {};

    const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const commonTags = {
      Project: projectName,
      Environment: 'dev',
      ManagedBy: 'terraform',
      GeneratedBy: 'ai-terraform-architect',
    };

    // Add root variables
    rootVariables.push({
      name: 'aws_region',
      type: 'string',
      default: 'us-east-1',
      description: 'AWS target region',
    });
    tfvarsValues['aws_region'] = 'us-east-1';

    rootVariables.push({
      name: 'common_tags',
      type: 'map(string)',
      default: commonTags,
      description: 'Common tags for all resources',
    });

    const hasModule = (name: string) => modules.some((m) => m.name === name);

    // 1. VPC mapping
    if (hasModule('vpc')) {
      perModule['vpc'] = {
        cidr_block: spec.networking?.vpcCidr || '10.0.0.0/16',
        availability_zones: spec.networking?.availabilityZones || 2,
        enable_nat_gateway: spec.networking?.natGateway ?? true,
        tags: 'var.common_tags', // Pass reference to variable
      };
      rootVariables.push({
        name: 'vpc_cidr',
        type: 'string',
        default: spec.networking?.vpcCidr || '10.0.0.0/16',
        description: 'VPC CIDR block',
      });
      tfvarsValues['vpc_cidr'] = spec.networking?.vpcCidr || '10.0.0.0/16';
    }

    // 2. Security Groups mapping
    if (hasModule('security-groups')) {
      perModule['security-groups'] = {
        vpc_id: 'module.vpc.vpc_id',
        tags: 'var.common_tags',
      };
    }

    // 3. ALB mapping
    if (hasModule('alb')) {
      perModule['alb'] = {
        name: `${projectSlug}-alb`,
        vpc_id: 'module.vpc.vpc_id',
        public_subnet_ids: 'module.vpc.public_subnet_ids',
        security_group_id: 'module.security_groups.web_sg_id',
        health_check_path: spec.loadBalancer?.healthCheckPath || '/',
        tags: 'var.common_tags',
      };

      rootOutputs.push({
        name: 'alb_dns_name',
        value: 'module.alb.dns_name',
        description: 'Public DNS of the Application Load Balancer',
      });
    }

    // 4. Compute mapping (EC2 or ECS)
    if (hasModule('ec2-asg')) {
      const minInstances = spec.compute?.autoScaling?.minInstances ?? spec.compute?.instanceCount ?? 2;
      const maxInstances = spec.compute?.autoScaling?.maxInstances ?? 6;

      perModule['ec2-asg'] = {
        instance_type: spec.compute?.instanceType || 't3.medium',
        min_size: minInstances,
        max_size: maxInstances,
        vpc_id: 'module.vpc.vpc_id',
        private_subnet_ids: 'module.vpc.private_subnet_ids',
        security_group_id: 'module.security_groups.app_sg_id',
        target_group_arn: hasModule('alb') ? 'module.alb.target_group_arn' : null,
        tags: 'var.common_tags',
      };

      rootVariables.push({
        name: 'instance_type',
        type: 'string',
        default: spec.compute?.instanceType || 't3.medium',
        description: 'EC2 instance type for app server',
      });
      tfvarsValues['instance_type'] = spec.compute?.instanceType || 't3.medium';
    }

    if (hasModule('ecs-fargate')) {
      perModule['ecs-fargate'] = {
        cluster_name: `${projectSlug}-ecs-cluster`,
        service_name: `${projectSlug}-service`,
        instance_count: spec.compute?.instanceCount || 2,
        private_subnet_ids: 'module.vpc.private_subnet_ids',
        security_group_id: 'module.security_groups.app_sg_id',
        target_group_arn: hasModule('alb') ? 'module.alb.target_group_arn' : null,
        aws_region: 'var.aws_region',
        tags: 'var.common_tags',
      };
    }

    // 5. Database mapping
    if (hasModule('rds-postgresql')) {
      const storageGb = spec.database?.storageGb || 20;
      // Map storage size to instance class
      let instanceClass = 'db.t3.micro';
      if (storageGb >= 100) instanceClass = 'db.t3.medium';
      if (storageGb >= 500) instanceClass = 'db.t3.large';

      perModule['rds-postgresql'] = {
        name: `${projectSlug}-db`,
        instance_class: instanceClass,
        allocated_storage: storageGb,
        multi_az: spec.database?.multiAz ?? false,
        subnet_ids: 'module.vpc.private_subnet_ids',
        security_group_id: 'module.security_groups.db_sg_id',
        password: 'random_password.db_pass.result', // Passed as expression reference
        tags: 'var.common_tags',
      };

      rootOutputs.push({
        name: 'db_endpoint',
        value: 'module.rds_postgresql.db_endpoint',
        description: 'Database connection endpoint',
      });
    }

    return {
      perModule,
      rootVariables,
      rootOutputs,
      tfvarsValues,
      commonTags,
    };
  }
}
