import { IsOptional, IsIn, IsNumber } from 'class-validator';

export class ReportsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'RESOLVED'])
  status?: string;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}