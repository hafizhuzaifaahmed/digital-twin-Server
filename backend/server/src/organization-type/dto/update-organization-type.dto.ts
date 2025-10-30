import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
