import { IsArray, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UserIdsDto {
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    userIds: number[];
}


