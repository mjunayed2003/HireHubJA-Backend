import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCmsDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}