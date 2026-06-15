import { Injectable } from '@nestjs/common';
import { AwsProviderMapper } from './mappers/aws-provider.mapper';
import { ProviderMapper } from './interfaces/provider-mapper.interface';

@Injectable()
export class ProviderMappingService {
  constructor(private readonly awsMapper: AwsProviderMapper) {}

  getMapper(provider: string): ProviderMapper {
    if (provider === 'aws') {
      return this.awsMapper;
    }
    throw new Error(`Cloud provider '${provider}' is not supported yet.`);
  }
}
