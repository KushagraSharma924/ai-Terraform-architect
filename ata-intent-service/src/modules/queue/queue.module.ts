import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntentGenerationProducer } from './producers/intent-generation.producer';
import { IntentGenerationConsumer } from './consumers/intent-generation.consumer';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'intent-parse',
    }),
    forwardRef(() => PipelineModule),
  ],
  providers: [IntentGenerationProducer, IntentGenerationConsumer],
  exports: [IntentGenerationProducer],
})
export class QueueModule {}
