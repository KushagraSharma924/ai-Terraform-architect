import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class IntentGenerationProducer {
  constructor(@InjectQueue('intent-parse') private readonly queue: Queue) {}

  async enqueueParseJob(generationId: string, userId: string): Promise<string> {
    const job = await this.queue.add('parse', { generationId, userId });
    return job.id || '';
  }
}
