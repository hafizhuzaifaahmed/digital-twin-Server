import { Injectable } from '@nestjs/common';
import { CreateAssestTaskDto } from './dto/create-assest_task.dto';
import { UpdateAssestTaskDto } from './dto/update-assest_task.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssestTaskService {
  constructor(private readonly prisma: PrismaService) { }

  create(createAssestTaskDto: CreateAssestTaskDto) {
    return this.prisma.asset_task.create({
      data: createAssestTaskDto,
    });
  }


  findAll() {
    return `This action returns all assestTask`;
  }

  findOne(id: number) {
    return `This action returns a #${id} assestTask`;
  }

  update(id: number, updateAssestTaskDto: UpdateAssestTaskDto) {
    return `This action updates a #${id} assestTask`;
  }

  remove(id: number) {
    return `This action removes a #${id} assestTask`;
  }
}
