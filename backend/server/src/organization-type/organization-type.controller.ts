import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { OrganizationTypeService } from './organization-type.service';
import { CreateOrganizationTypeDto } from './dto/create-organization-type.dto';
import { UpdateOrganizationTypeDto } from './dto/update-organization-type.dto';

@Controller('organization-type')
export class OrganizationTypeController {
  constructor(private readonly organizationTypeService: OrganizationTypeService) {}

  @Post()
  create(@Body() dto: CreateOrganizationTypeDto) {
    return this.organizationTypeService.create(dto);
  }

  @Get()
  findAll() {
    return this.organizationTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationTypeService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrganizationTypeDto) {
    return this.organizationTypeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.organizationTypeService.remove(id);
  }
}
