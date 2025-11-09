import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Users3dService } from './users-3d.service';
import { CreateUser3dDto } from './dto/create-user-3d.dto';
import { UpdateUser3dDto } from './dto/update-user-3d.dto';

@ApiTags('3D Users')
@ApiBearerAuth()
@Controller('users-3d')
export class Users3dController {
  constructor(private readonly users3dService: Users3dService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new 3D user' })
  create(@Body() dto: CreateUser3dDto) {
    return this.users3dService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all 3D users' })
  findAll() {
    return this.users3dService.findAll();
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get all 3D users by company' })
  findByCompany(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.users3dService.findByCompany(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a 3D user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users3dService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a 3D user' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUser3dDto) {
    return this.users3dService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a 3D user' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users3dService.remove(id);
  }
}
