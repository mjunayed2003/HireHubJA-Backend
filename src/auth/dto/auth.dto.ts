import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty() @IsString() fullName: string;
  @IsNotEmpty() @IsEmail() email: string;
  @IsNotEmpty() @IsString() @MinLength(6) password: string;
  @IsNotEmpty() @IsEnum(['JOB_SEEKER', 'EMPLOYER', 'COMPANY']) role: string;
  @IsOptional() @IsString() companyName?: string;
}

export class LoginDto {
  @IsNotEmpty() @IsEmail() email: string;
  @IsNotEmpty() @IsString() password: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty() @IsEmail() email: string;
}

export class JobSeekerBasicDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() about?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsString() preferredJobCategoryIds?: string;
  @IsOptional() @IsString() employmentType?: string;
}

export class JobSeekerEducationDto {
  @IsOptional() @IsString() education?: string;
}

export class JobSeekerProfessionalDto {
  @IsOptional() @IsString() experienceLevel?: string;
  @IsOptional() @IsString() skills?: string;
  @IsOptional() @IsString() experience?: string;
}

export class EmployerBasicDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() about?: string;
  @IsOptional() @IsString() website?: string;
}

export class CompanyBasicDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() about?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() businessRegCertId?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() authorizedRepId?: string;
}