import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ProjectServiceClient } from '../src/common/clients/project-service.client';
import { IntentGenerationProducer } from '../src/modules/queue/producers/intent-generation.producer';
import { PipelineOrchestratorService } from '../src/modules/pipeline/pipeline-orchestrator.service';

// Mock BullMQ completely to avoid Redis requirement
jest.mock('@nestjs/bullmq', () => {
  return {
    BullModule: {
      forRootAsync: () => ({
        module: class {},
        providers: [],
        exports: [],
      }),
      registerQueue: () => ({
        module: class {},
        providers: [
          {
            provide: 'BullQueue_intent-parse',
            useValue: {
              add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
            },
          },
        ],
        exports: ['BullQueue_intent-parse'],
      }),
    },
    InjectQueue: () => (target: any, key: string, index: number) => {},
    Processor: () => (target: any) => {},
    WorkerHost: class WorkerHost {
      // Stub process method
      async process() {}
    },
    getQueueToken: () => 'BullQueue_intent-parse',
  };
});

describe('Generations (e2e)', () => {
  let app: INestApplication;
  const projectServiceClientMock = {
    getQuota: jest.fn().mockResolvedValue({ generationsUsed: 0, generationsLimit: 10 }),
    decrementQuota: jest.fn().mockResolvedValue({ success: true }),
  };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProjectId = '223e4567-e89b-12d3-a456-426614174000';
  let createdGenerationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProjectServiceClient)
      .useValue(projectServiceClientMock)
      .overrideProvider(IntentGenerationProducer)
      .useValue({
        enqueueParseJob: async (generationId: string, userId: string) => {
          // Directly invoke the orchestrator synchronously for testing
          const orchestrator = moduleFixture.get(PipelineOrchestratorService);
          await orchestrator.process(generationId, userId);
          return 'mock-job-id';
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should deny access if headers are missing', async () => {
    await request(app.getHttpServer())
      .post('/generations')
      .send({
        projectId: mockProjectId,
        prompt: 'Create a three-tier web application with EC2 and PostgreSQL',
        cloudProviderHint: 'aws',
      })
      .expect(401);
  });

  it('should create a new generation and process it synchronously', async () => {
    const res = await request(app.getHttpServer())
      .post('/generations')
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .send({
        projectId: mockProjectId,
        prompt: 'Create a three-tier web app with EC2 and PostgreSQL',
        cloudProviderHint: 'aws',
        provider: 'openai',
      })
      .expect(202);

    expect(res.body).toHaveProperty('generationId');
    expect(res.body.status).toBe('pending');
    createdGenerationId = res.body.generationId;
  });

  it('should retrieve the completed generation with a valid spec', async () => {
    const res = await request(app.getHttpServer())
      .get(`/generations/${createdGenerationId}`)
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .expect(200);

    expect(res.body.id).toBe(createdGenerationId);
    expect(res.body.status).toBe('completed');
    expect(res.body.infrastructureSpec).toBeDefined();
    expect(res.body.infrastructureSpec.cloudProvider).toBe('aws');
  });

  it('should get status of a generation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/generations/${createdGenerationId}/status`)
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .expect(200);

    expect(res.body.status).toBe('completed');
  });

  it('should list generations for a project', async () => {
    const res = await request(app.getHttpServer())
      .get(`/projects/${mockProjectId}/generations`)
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(createdGenerationId);
  });

  it('should refine a generation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/generations/${createdGenerationId}/refine`)
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .send({
        prompt: 'Please change the instance type to t3.large',
        provider: 'openai',
      })
      .expect(202);

    expect(res.body).toHaveProperty('generationId');
    expect(res.body.parentGenerationId).toBe(createdGenerationId);
  });

  it('should delete a generation', async () => {
    await request(app.getHttpServer())
      .delete(`/generations/${createdGenerationId}`)
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .expect(204);

    await request(app.getHttpServer())
      .get(`/generations/${createdGenerationId}`)
      .set('x-user-id', mockUserId)
      .set('x-user-role', 'user')
      .expect(404);
  });
});
