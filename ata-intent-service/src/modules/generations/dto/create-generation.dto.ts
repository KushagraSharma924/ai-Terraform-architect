import { IsUUID, IsString, Length, IsOptional, IsIn } from 'class-validator';

export class CreateGenerationDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @Length(10, 4000)
  prompt: string;

  @IsOptional()
  @IsIn(['aws', 'azure', 'gcp'])
  cloudProviderHint?: 'aws' | 'azure' | 'gcp';

  @IsOptional()
  @IsIn(['openai', 'claude', 'gemini', 'grok', 'ollama'])
  provider?: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama';
}

