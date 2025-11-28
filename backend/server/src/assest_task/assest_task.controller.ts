import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AssestTaskService } from './assest_task.service';
import { CreateAssestTaskDto } from './dto/create-assest_task.dto';
import { UpdateAssestTaskDto } from './dto/update-assest_task.dto';

@Controller('assest-task')
export class AssestTaskController {
  constructor(private readonly assestTaskService: AssestTaskService) {}

  @Post()
  create(@Body() createAssestTaskDto: CreateAssestTaskDto) {
    return this.assestTaskService.create(createAssestTaskDto);
  }

  @Get()
  findAll() {
    return this.assestTaskService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assestTaskService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssestTaskDto: UpdateAssestTaskDto) {
    return this.assestTaskService.update(+id, updateAssestTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assestTaskService.remove(+id);
  }
}
