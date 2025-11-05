import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  companyCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  created_by!: number;

  @IsOptional()
  @IsInt()
  org_type_id?: number;
}
