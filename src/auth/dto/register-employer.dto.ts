import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../generated/prisma/client'; // পাথ ঠিক করে নিন

export class RegisterEmployerDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;


  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.EMPLOYER; 

  @IsNotEmpty()
  fullName: string; // Contact Person

  @IsNotEmpty()
  companyName: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  location?: string;

  @IsOptional()
  about?: string;

  @IsOptional()
  website?: string;
}