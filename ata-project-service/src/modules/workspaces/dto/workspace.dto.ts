import { IsString, MinLength, MaxLength, IsOptional, IsEmail, IsIn } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsIn(['editor', 'viewer'])
  role: 'editor' | 'viewer';
}

export class UpdateMemberRoleDto {
  @IsIn(['editor', 'viewer'])
  role: 'editor' | 'viewer';
}
