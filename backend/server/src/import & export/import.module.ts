import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ExcelParserService } from './excel-parser.service';
import { ExportService } from './export.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImportController],
  providers: [ImportService, ExcelParserService, ExportService],
  exports: [ImportService, ExcelParserService, ExportService],
})
export class ImportModule {}
