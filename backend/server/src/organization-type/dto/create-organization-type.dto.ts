import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
