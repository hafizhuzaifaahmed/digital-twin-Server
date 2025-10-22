import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  ParseIntPipe, 
  Patch, 
  Post, 
  Query 
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PeopleService } from './people.service';
import { CreatePeopleDto } from './dto/create-people.dto';
import { UpdatePeopleDto } from './dto/update-people.dto';

@ApiTags('people')
@Controller('people')
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new person' })
  @ApiResponse({ status: 201, description: 'Person created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() dto: CreatePeopleDto) {
    return this.peopleService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all people' })
  @ApiResponse({ status: 200, description: 'Return all people' })
  findAll() {
    return this.peopleService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Find person by code' })
  @ApiResponse({ status: 200, description: 'Return person by code' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  findByCode(@Query('code') code: string) {
    return this.peopleService.findByCode(code);
  }

  @Get('with-relations')
  @ApiOperation({ summary: 'Get all people with relations' })
  @ApiResponse({ status: 200, description: 'Return all people with relations' })
  findAllWithRelations() {
    return this.peopleService.findAllWithRelations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get person by ID' })
  @ApiResponse({ status: 200, description: 'Return person by ID' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.findOne(id);
  }

  @Get(':id/with-relations')
  @ApiOperation({ summary: 'Get person by ID with relations' })
  @ApiResponse({ status: 200, description: 'Return person by ID with relations' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  findOneWithRelations(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.findOneWithRelations(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a person' })
  @ApiResponse({ status: 200, description: 'Person updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() dto: UpdatePeopleDto
  ) {
    return this.peopleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a person' })
  @ApiResponse({ status: 200, description: 'Person deleted successfully' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.peopleService.remove(id);
  }
}
