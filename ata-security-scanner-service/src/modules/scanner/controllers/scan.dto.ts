import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateScanDto {
  @IsEnum(['project_version', 'deployment'])
  targetType: 'project_version' | 'deployment';

  @IsUUID()
  targetId: string;
}

export class SuppressDto {
  @IsString()
  ruleId: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO date
}
