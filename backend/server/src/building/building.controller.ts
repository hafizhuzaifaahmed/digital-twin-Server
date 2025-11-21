import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { BuildingService } from './building.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) { }

  @Post()
  create(@Body() dto: CreateBuildingDto) {
    return this.buildingService.create(dto);
  }

  @Get()
  findAll() {
    return this.buildingService.findAll();
  }

  @Get('with-relations')
  findAllWithRelations() {
    return this.buildingService.findAllWithRelations();
  }

  @Get('companyId/:company_id')
  findByCompany(@Param('company_id', ParseIntPipe) company_id: number) {
    return this.buildingService.findByCompany(company_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.buildingService.findOne(id);
  }

  @Get(':id/with-relations')
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.buildingService.findOneWithRelations(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBuildingDto) {
    return this.buildingService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.buildingService.remove(id);
  }
}
