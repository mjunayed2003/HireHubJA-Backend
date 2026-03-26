import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyJobDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @IsDateString()
  @IsOptional()
  availableFrom?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  shortMessage?: string;

  // ------------------------------------------------
  // 1. Previous/Current Job Reference
  // ------------------------------------------------
  @IsOptional()
  @IsString()
  refJobName?: string;

  @IsOptional()
  @IsString()
  refJobCompany?: string;

  @IsOptional()
  @IsString()
  refJobTitle?: string;

  @IsOptional()
  @IsString()
  refJobRelationship?: string;

  @IsOptional()
  @IsString()
  refJobPhone?: string;

  @IsOptional()
  @IsString()
  refJobEmail?: string;

  // ------------------------------------------------
  // 2. Justice of the Peace (JP)
  // ------------------------------------------------
  @IsOptional()
  @IsString()
  refJpName?: string;

  @IsOptional()
  @IsString()
  refJpContact?: string;

  @IsOptional()
  @IsString()
  refJpJurisdiction?: string;

  @IsOptional()
  @IsString()
  refJpRelationship?: string;

  // ------------------------------------------------
  // 3. Pastor / Religious Leader
  // ------------------------------------------------
  @IsOptional()
  @IsString()
  refPastorName?: string;

  @IsOptional()
  @IsString()
  refPastorChurch?: string;

  @IsOptional()
  @IsString()
  refPastorContact?: string;

  @IsOptional()
  @IsString()
  refPastorRelationship?: string;

  // ------------------------------------------------
  // 4. Relative
  // ------------------------------------------------
  @IsOptional()
  @IsString()
  refRelativeName?: string;

  @IsOptional()
  @IsString()
  refRelativeContact?: string;

  @IsOptional()
  @IsString()
  refRelativeRelationship?: string;
}

export class ReportJobDto {
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  details!: string;
}