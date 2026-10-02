import { IsString, IsInt, IsOptional, Min, IsIn } from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  repoPrefix?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  retentionDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  warningDays?: number;

  @IsOptional()
  @IsIn(['delete', 'archive'])
  defaultExpiryAction?: 'delete' | 'archive';

  @IsOptional()
  @IsString()
  githubOrg?: string;
}
