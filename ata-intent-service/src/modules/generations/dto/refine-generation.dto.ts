import { IsString, Length, IsOptional, IsIn } from 'class-validator';

export class RefineGenerationDto {
  @IsString()
  @Length(5, 4000)
  prompt: string;

  @IsOptional()
  @IsIn(['openai', 'claude', 'gemini', 'grok', 'ollama'])
  provider?: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama';
}

