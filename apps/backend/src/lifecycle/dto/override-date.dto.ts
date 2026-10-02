import { IsString, IsISO8601, IsOptional, IsIn } from 'class-validator';

export class OverrideDateDto {
  @IsString()
  @IsISO8601()
  customExpiryDate: string;

  @IsOptional()
  @IsIn(['delete', 'archive'])
  customAction?: 'delete' | 'archive';
}
