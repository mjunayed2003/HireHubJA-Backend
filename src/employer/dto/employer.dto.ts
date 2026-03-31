import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsBoolean, IsInt, Min  } from 'class-validator';
import { JobType, JobStatus, ApplicationStatus, InterviewStatus } from '../../generated/prisma/client';


// 1. Post Job DTO
export class CreateJobDto {
  // ── Step 1: Job Basics ──────────────────────────────
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfEmployees?: number;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  categoryIds!: string[]; // Multiple categories

  @IsArray()
  @IsEnum(JobType, { each: true })
  jobType!: JobType[]; // ["FULL_TIME", "PART_TIME"]

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workTime?: string[];

  @IsBoolean()
  @IsOptional()
  isRemote?: boolean;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  // ── Step 2: Job Details ──────────────────────────────
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  // ── Step 3: Skills & Candidate Criteria ─────────────
  @IsString()
  @IsOptional()
  experienceLevel?: string; // "Entry" | "Mid" | "Senior"

  @IsInt()
  @Min(0)
  @IsOptional()
  minExperience?: number;

  @IsString()
  @IsOptional()
  educationLevel?: string;

  // ── Step 4: Salary & Payment ─────────────────────────
  @IsString()
  @IsOptional()
  salaryType?: string; // "FIXED" | "RANGE" | "NEGOTIABLE"

  @IsString()
  @IsOptional()
  salaryFrequency?: string; // "MONTHLY" | "WEEKLY" | "CONTRACT"

  @IsString()
  @IsOptional()
  salaryAmount?: string; // "1000" or "1000-2000"

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

// 1b. Update Job DTO
export class UpdateJobDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfEmployees?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[]; // Multiple categories

  @IsArray()
  @IsEnum(JobType, { each: true })
  @IsOptional()
  jobType?: JobType[];

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workTime?: string[];

  @IsBoolean()
  @IsOptional()
  isRemote?: boolean;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  responsibilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @IsString()
  @IsOptional()
  experienceLevel?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  minExperience?: number;

  @IsString()
  @IsOptional()
  educationLevel?: string;

  @IsString()
  @IsOptional()
  salaryType?: string;

  @IsString()
  @IsOptional()
  salaryFrequency?: string;

  @IsString()
  @IsOptional()
  salaryAmount?: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}

// 2. Schedule Interview DTO
export class ScheduleInterviewDto {
  @IsDateString()
  @IsNotEmpty()
  scheduleDate!: string;

  @IsString()
  @IsOptional()
  scheduleTime?: string; // ✅ "11:00AM"

  @IsString()
  @IsOptional()
  interviewType?: string; // ✅ "Video (Zoom)"

  @IsString()
  @IsOptional()
  duration?: string; // ✅ "30 minutes"

  @IsString()
  @IsOptional()
  meetingLink?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

// 3. Change Application Status DTO (Reject/Hire)
export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  @IsNotEmpty()
  status!: ApplicationStatus; // 'HIRED' or 'REJECTED'
}

// 4. Change Interview Status DTO
export class UpdateInterviewStatusDto {
  @IsEnum(InterviewStatus)
  @IsNotEmpty()
  status!: InterviewStatus;
}