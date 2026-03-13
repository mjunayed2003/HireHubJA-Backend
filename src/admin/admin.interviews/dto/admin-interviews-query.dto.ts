import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AdminInterviewsQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() employer?: string;   // filter by employer name
  @IsOptional() @IsString() candidate?: string;  // filter by candidate name
  @IsOptional() @IsString() date?: string;       // filter by date e.g. "2026-02-12"
  @IsOptional() @IsNumber() page?: number = 1;
  @IsOptional() @IsNumber() limit?: number = 10;
}