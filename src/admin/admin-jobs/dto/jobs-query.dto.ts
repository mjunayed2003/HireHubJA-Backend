import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AdminJobsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() page?: number = 1;
  @IsOptional() @IsNumber() limit?: number = 10;
}