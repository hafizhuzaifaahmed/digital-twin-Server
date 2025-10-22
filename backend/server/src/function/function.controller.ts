import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { FunctionService } from './function.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Controller('function')
export class FunctionController {
  constructor(private readonly functionService: FunctionService) {}

  @Post()
  create(@Body() dto: CreateFunctionDto) {
    return this.functionService.create(dto);
  }

  @Get()
  findAll() {
    return this.functionService.findAll();
  }

  @Get('with-relations')
  findAllWithRelations() {
    return this.functionService.findAllWithRelations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.functionService.findOne(id);
  }

  @Get(':id/with-relations')
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.functionService.findOneWithRelations(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFunctionDto) {
    return this.functionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.functionService.remove(id);
  }
}
