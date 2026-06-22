import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ConnectAccountDto {
  @IsEnum(['assume_role', 'oidc'])
  authMethod: 'assume_role' | 'oidc';

  @IsOptional()
  @IsString()
  roleArn?: string;

  @IsOptional()
  @IsString()
  defaultRegion?: string;
}

export class CreateDeploymentDto {
  @IsUUID()
  cloudAccountId: string;

  @IsUUID()
  projectVersionId: string;

  @IsOptional()
  @IsString()
  environment?: string;
}

export class GuardrailDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyLimitUsd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  perDeployLimitUsd?: number;

  @IsEnum(['warn', 'block'])
  action: 'warn' | 'block';
}
