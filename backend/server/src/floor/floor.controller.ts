import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { FloorService } from './floor.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Controller('floor')
export class FloorController {
  constructor(private readonly floorService: FloorService) { }

  @Post()
  create(@Body() dto: CreateFloorDto) {
    return this.floorService.create(dto);
  }

  @Get()
  findAll() {
    return this.floorService.findAll();
  }

  @Get('buildingId/:building_id')
  findFloorsByBuilding(@Param('building_id', ParseIntPipe) building_id: number) {
    return this.floorService.findFloorsByBuilding(building_id);
  }

  @Get('with-relations')
  findAllWithRelations() {
    return this.floorService.findAllWithRelations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.floorService.findOne(id);
  }

  @Get(':id/with-relations')
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.floorService.findOneWithRelations(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFloorDto) {
    return this.floorService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.floorService.remove(id);
  }
}
