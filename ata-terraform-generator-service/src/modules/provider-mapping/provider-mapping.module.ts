import { Module } from '@nestjs/common';
import { AwsProviderMapper } from './mappers/aws-provider.mapper';
import { ProviderMappingService } from './provider-mapping.service';

@Module({
  providers: [AwsProviderMapper, ProviderMappingService],
  exports: [ProviderMappingService],
})
export class ProviderMappingModule {}
