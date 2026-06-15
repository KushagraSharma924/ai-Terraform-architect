import { Test, TestingModule } from '@nestjs/testing';
import { ModuleSelectorService } from './module-selector.service';
import { ModuleRegistryRepository } from '../repositories/module-registry.repository';

describe('ModuleSelectorService', () => {
  let service: ModuleSelectorService;
  let repoMock: any;

  beforeEach(async () => {
    repoMock = {
      findActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleSelectorService,
        { provide: ModuleRegistryRepository, useValue: repoMock },
      ],
    }).compile();

    service = module.get<ModuleSelectorService>(ModuleSelectorService);
  });

  it('should resolve and topologically sort modules', async () => {
    repoMock.findActive.mockImplementation((provider, category, name) => {
      if (name === 'vpc') {
        return { id: 'vpc-id', provider, category, name, version: '1.0.0', sourcePath: 'vpc', requiredVariables: [], outputs: [], dependsOn: [] };
      }
      if (name === 'security-groups') {
        return { id: 'sg-id', provider, category, name, version: '1.0.0', sourcePath: 'sg', requiredVariables: [], outputs: [], dependsOn: ['vpc'] };
      }
      if (name === 'alb') {
        return { id: 'alb-id', provider, category, name, version: '1.0.0', sourcePath: 'alb', requiredVariables: [], outputs: [], dependsOn: ['vpc', 'security-groups'] };
      }
      return null;
    });

    const selections = [
      { category: 'loadbalancing', name: 'alb' },
      { category: 'security', name: 'security-groups' },
      { category: 'networking', name: 'vpc' },
    ];

    const sorted = await service.resolveAndSort('aws', selections);
    expect(sorted.length).toBe(3);
    expect(sorted[0].name).toBe('vpc');
    expect(sorted[1].name).toBe('security-groups');
    expect(sorted[2].name).toBe('alb');
  });

  it('should detect circular dependencies', async () => {
    repoMock.findActive.mockImplementation((provider, category, name) => {
      if (name === 'a') {
        return { id: 'a', provider, category, name, version: '1.0.0', sourcePath: 'a', requiredVariables: [], outputs: [], dependsOn: ['b'] };
      }
      if (name === 'b') {
        return { id: 'b', provider, category, name, version: '1.0.0', sourcePath: 'b', requiredVariables: [], outputs: [], dependsOn: ['a'] };
      }
      return null;
    });

    const selections = [
      { category: 'test', name: 'a' },
      { category: 'test', name: 'b' },
    ];

    await expect(service.resolveAndSort('aws', selections)).rejects.toThrow('Circular dependency detected');
  });
});
