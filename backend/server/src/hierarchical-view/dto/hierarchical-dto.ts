import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UserIdsDto {
    @IsArray()
    @IsInt({ each: true })
    @Type(() => Number)
    userIds: number[];
}
