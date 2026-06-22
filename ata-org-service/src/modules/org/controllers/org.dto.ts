import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

const ROLES = ['admin', 'member', 'viewer', 'billing'] as const;

export class CreateOrgDto {
  @IsString()
  @MinLength(2)
  name: string;
}

export class InviteMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(ROLES)
  role: (typeof ROLES)[number];
}

export class UpdateRoleDto {
  @IsEnum(ROLES)
  role: (typeof ROLES)[number];
}

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name: string;
}

export class AddTeamMemberDto {
  @IsUUID()
  userId: string;
}

export class CommentDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class ApprovalPolicyDto {
  @IsInt()
  @Min(1)
  requiredApprovers: number;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class DecisionDto {
  @IsUUID()
  deploymentId: string;

  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}
