import { IsInt, IsOptional, IsString, IsEnum, IsUrl, IsBoolean } from 'class-validator';

export enum AssetTaskType {
    EVENT = 'event',
    DOCUMENT = 'document',
    INFORMATION = 'information',
}

export class CreateAssestTaskDto {
    @IsInt()
    task_id: number;

    @IsInt()
    @IsOptional()
    process_id?: number;

    @IsEnum(AssetTaskType)
    type: AssetTaskType;

    @IsBoolean()
    @IsOptional()
    input?: boolean;

    @IsBoolean()
    @IsOptional()
    output?: boolean;

    @IsString()
    description: string;

    @IsString()
    @IsUrl()
    @IsOptional()
    document_link?: string; // Only required if type === DOCUMENT
}
