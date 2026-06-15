import { Module, forwardRef } from '@nestjs/common';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { PipelineModule } from '../pipeline/pipeline.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    forwardRef(() => PipelineModule),
    forwardRef(() => QueueModule),
  ],
  controllers: [GenerationsController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule {}
