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
        companyName: {
          type: 'string',
          default: 'Maldova Hospital',
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
    @Body('companyName') companyName?: string,
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
    const company = companyName || 'Maldova Hospital';
    const isDryRun = dryRun === 'true' || dryRun === '1';
    const result = await this.importService.importExcelData(
      parsedData,
      company,
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
        peopleJob: parsedData.peopleJob.length,
      },
      data: parsedData, // Include actual data for debugging
    };
  }

  @Get('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export company data to Excel file (Requires Authentication)' })
  @ApiQuery({
    name: 'companyName',
    required: false,
    description: 'Company name to export data for',
    example: 'Maldova Hospital',
  })
  async exportExcel(
    @Query('companyName') companyName: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const company = companyName || 'Maldova Hospital';

    try {
      // Export data to Excel buffer
      const excelBuffer = await this.exportService.exportToExcel(company);

      // Set response headers for file download
      const fileName = `${company.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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
