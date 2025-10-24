import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ImportService } from './import.service';
import { ExcelParserService } from './excel-parser.service';
import { ExportService } from './export.service';
import { ImportResponseDto } from './dto/import-response.dto';
import type { Response } from 'express';

@ApiTags('Import')
@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly excelParserService: ExcelParserService,
    private readonly exportService: ExportService,
  ) {}

  @Post('excel')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import data from Excel file (Requires Authentication)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        dryRun: {
          type: 'string',
          description: 'Set to "true" to test without saving to database',
          default: 'false',
        },
      },
    },
  })
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('dryRun') dryRun?: string,
  ): Promise<ImportResponseDto> {
    // Validate file upload
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (
      !file.originalname.match(/\.(xlsx|xls)$/) &&
      file.mimetype !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      throw new BadRequestException(
        'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size exceeds limit. Maximum file size is 10MB',
      );
    }

    // Validate Excel structure
    const validation = this.excelParserService.validateExcelStructure(
      file.buffer,
    );
    if (!validation.valid) {
      throw new BadRequestException(
        `Excel file is missing required sheets: ${validation.missingSheets.join(', ')}`,
      );
    }

    // Parse Excel file
    const parsedData = this.excelParserService.parseExcelFile(file.buffer);

    // Import data
    const isDryRun = dryRun === 'true' || dryRun === '1';
    const result = await this.importService.importExcelData(
      parsedData,
      isDryRun,
    );

    return result;
  }

  @Post('validate')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Validate Excel file without importing (Requires Authentication)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async validateExcel(@UploadedFile() file: Express.Multer.File) {
    // Validate file upload
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate Excel structure
    const validation = this.excelParserService.validateExcelStructure(
      file.buffer,
    );

    // Get sheet names
    const sheetNames = this.excelParserService.getSheetNames(file.buffer);

    // Parse to get row counts
    const parsedData = this.excelParserService.parseExcelFile(file.buffer);

    return {
      valid: validation.valid,
      missingSheets: validation.missingSheets,
      foundSheets: sheetNames,
      rowCounts: {
        companies: parsedData.companies.length,
        functions: parsedData.functions.length,
        jobs: parsedData.jobs.length,
        tasks: parsedData.tasks.length,
        processes: parsedData.processes.length,
        people: parsedData.people.length,
        taskProcess: parsedData.taskProcess.length,
        jobTask: parsedData.jobTask.length,
        functionJob: parsedData.functionJob.length,
      },
      data: parsedData, // Include actual data for debugging
    };
  }

  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export process data to Excel file (Requires Authentication)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of process IDs to export',
          example: [25, 24, 23],
        },
      },
    },
  })
  async exportExcel(
    @Body('ids') processIds: number[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!processIds || processIds.length === 0) {
      throw new BadRequestException('Process IDs array is required');
    }

    try {
      // Export data to Excel buffer
      const excelBuffer = await this.exportService.exportToExcel(processIds);

      // Set response headers for file download
      const fileName = `processes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      return new StreamableFile(excelBuffer);
    } catch (error) {
      throw new BadRequestException(
        `Failed to export data: ${error.message}`,
      );
    }
  }
}
