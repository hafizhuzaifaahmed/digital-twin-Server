import { Module } from '@nestjs/common';
import { TableService, TableAssignmentService } from './table.service';
import { TableController } from './table.controller';

@Module({
  controllers: [TableController],
  providers: [TableService, TableAssignmentService],
  exports: [TableService, TableAssignmentService],
})
export class TableModule {}
