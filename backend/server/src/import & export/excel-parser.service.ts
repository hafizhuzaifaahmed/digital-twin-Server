import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParsedExcelData } from './dto/sheet-data.dto';

@Injectable()
export class ExcelParserService {
  /**
   * Parse uploaded Excel file and extract data from all sheets
   */
  parseExcelFile(buffer: Buffer): ParsedExcelData {
    try {
      // Read the Excel file from buffer with additional options
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellStyles: false,
        WTF: false // Don't throw on parse errors, continue parsing
      });

      // Initialize parsed data structure
      const parsedData: ParsedExcelData = {
        functions: [],
        jobs: [],
        tasks: [],
        processes: [],
        people: [],
        taskProcess: [],
        jobTask: [],
        functionJob: [],
        peopleJob: [],
      };

      // Parse each sheet
      parsedData.functions = this.parseSheet(workbook, 'Function');
      parsedData.jobs = this.parseSheet(workbook, 'Job');
      parsedData.tasks = this.parseSheet(workbook, 'Task');
      parsedData.processes = this.parseSheet(workbook, 'Process');
      parsedData.people = this.parseSheet(workbook, 'People');
      parsedData.taskProcess = this.parseSheet(workbook, 'Task-Process');
      parsedData.jobTask = this.parseSheet(workbook, 'Job-Task');
      parsedData.functionJob = this.parseSheet(workbook, 'Function-Job');
      parsedData.peopleJob = this.parseSheet(workbook, 'people-job');

      return parsedData;
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse Excel file: ${error.message}`,
      );
    }
  }

  /**
   * Parse a specific sheet from the workbook
   */
  private parseSheet(workbook: XLSX.WorkBook, sheetName: string): any[] {
    // Check if sheet exists
    if (!workbook.SheetNames.includes(sheetName)) {
      console.warn(`Sheet "${sheetName}" not found in Excel file`);
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON with header row as keys
    const data = XLSX.utils.sheet_to_json(worksheet, {
      defval: null, // Use null for empty cells
      raw: false, // Convert numbers to strings
    });

    // Filter out completely empty rows
    return data.filter((row: any) => {
      return Object.values(row).some(
        (value) => value !== null && value !== '',
      );
    });
  }

  /**
   * Validate that required sheets exist in the Excel file
   */
  validateExcelStructure(buffer: Buffer): {
    valid: boolean;
    missingSheets: string[];
  } {
    try {
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellStyles: false,
        WTF: false // Don't throw on parse errors, continue parsing
      });
      const requiredSheets = [
        'Function',
        'Job',
        'Task',
        'Process',
        'Task-Process',
        'Job-Task',
      ];

      const missingSheets = requiredSheets.filter(
        (sheet) => !workbook.SheetNames.includes(sheet),
      );

      return {
        valid: missingSheets.length === 0,
        missingSheets,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to read Excel file: ${error.message}. Please ensure the file is a valid Excel file (.xlsx) and not corrupted.`,
      );
    }
  }

  /**
   * Get sheet names from Excel file
   */
  getSheetNames(buffer: Buffer): string[] {
    try {
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellStyles: false,
        WTF: false
      });
      return workbook.SheetNames;
    } catch (error) {
      throw new BadRequestException(
        `Failed to read Excel file: ${error.message}`,
      );
    }
  }
}
