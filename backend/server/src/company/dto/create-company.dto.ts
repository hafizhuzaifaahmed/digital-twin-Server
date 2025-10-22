import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  companyCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  created_by!: number;
}
