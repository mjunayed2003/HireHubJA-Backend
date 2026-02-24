import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterJobSeekerDto {
  // --- User Credentials ---
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  // --- Basic Profile Info ---
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  about?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
  experienceLevel?: string;

  // --- Arrays 
  @IsOptional()
  skills?: string; // e.g. '["Java", "Python"]'

  @IsOptional()
  education?: string; // e.g. '[{"degreeName": "BSc", ...}]'

  @IsOptional()
  experience?: string; // e.g. '[{"companyName": "ABC", ...}]'
  
  @IsOptional()
  preferredJobCategoryIds?: string; // e.g. '["id1", "id2"]'
}