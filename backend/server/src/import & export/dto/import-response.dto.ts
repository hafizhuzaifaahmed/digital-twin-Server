export class SheetImportDetail {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export class ImportSummary {
  totalSheets: number;
  processedSheets: number;
  totalRecords: number;
  imported: number;
  skipped: number;
  failed: number;
}

export class ImportResponseDto {
  success: boolean;
  message: string;
  summary: ImportSummary;
  details: Record<string, SheetImportDetail>;
}
