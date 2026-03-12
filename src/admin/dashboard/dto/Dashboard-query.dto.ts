import { IsOptional, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(['weekly', 'monthly', 'yearly'])
  period?: 'weekly' | 'monthly' | 'yearly' = 'weekly';

  @IsOptional()
  @IsIn(['JOB_SEEKER', 'EMPLOYER', 'COMPANY'])
  type?: 'JOB_SEEKER' | 'EMPLOYER' | 'COMPANY' = 'JOB_SEEKER';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}