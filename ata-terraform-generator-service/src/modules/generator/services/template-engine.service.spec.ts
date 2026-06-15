import { TemplateEngineService } from './template-engine.service';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(() => {
    service = new TemplateEngineService();
  });

  it('should render versions configuration', () => {
    const res = service.renderVersions(true);
    expect(res).toContain('required_providers');
    expect(res).toContain('random = {');
    expect(res).toContain('aws = {');
  });

  it('should render variables configuration', () => {
    const vars = [
      { name: 'aws_region', type: 'string', default: 'us-west-2', description: 'Region' },
      { name: 'common_tags', type: 'map(string)', default: { Env: 'dev' }, description: 'Tags' },
    ];
    const res = service.renderVariables(vars);
    expect(res).toContain('variable "aws_region"');
    expect(res).toContain('default     = "us-west-2"');
    expect(res).toContain('variable "common_tags"');
    expect(res).toContain('Env = "dev"');
  });

  it('should render outputs configuration', () => {
    const outputs = [
      { name: 'alb_dns', value: 'module.alb.dns_name', description: 'DNS' },
    ];
    const res = service.renderOutputs(outputs);
    expect(res).toContain('output "alb_dns"');
    expect(res).toContain('value       = module.alb.dns_name');
  });

  it('should render main configuration', () => {
    const modules = [
      { id: '1', provider: 'aws' as const, category: 'networking', name: 'vpc', version: '1.0.0', sourcePath: 'aws/networking/vpc', requiredVariables: [], optionalVariables: [], outputs: [], dependsOn: [] },
    ];
    const perModule = {
      vpc: {
        cidr_block: '10.0.0.0/16',
      },
    };
    const res = service.renderMain('TestProj', 1, 'gen-uuid', false, modules, perModule);
    expect(res).toContain('module "vpc"');
    expect(res).toContain('source = "./modules/aws/networking/vpc"');
    expect(res).toContain('cidr_block = "10.0.0.0/16"');
  });
});
