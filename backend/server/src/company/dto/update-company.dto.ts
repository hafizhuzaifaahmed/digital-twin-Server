import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  companyCode?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsInt()
  created_by?: number | null;

  @IsOptional()
  @IsInt()
  org_type_id?: number | null;
}
