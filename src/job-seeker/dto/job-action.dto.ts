import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyJobDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsOptional()
  resumeUrl?: string; // ✅ Upload করা resume URL

  @IsDateString()
  @IsOptional()
  availableFrom?: string; // ✅ Availability / Start Date

  @IsString()
  @IsOptional()
  @MaxLength(150)
  shortMessage?: string;
}

export class ReportJobDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  details: string;
}