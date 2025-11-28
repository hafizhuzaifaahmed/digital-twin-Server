import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let errorResponse: ErrorResponse;

    if (exception instanceof HttpException) {
      errorResponse = this.handleHttpException(exception, request);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      errorResponse = this.handlePrismaKnownError(exception, request);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      errorResponse = this.handlePrismaValidationError(exception, request);
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      errorResponse = this.handlePrismaInitializationError(exception, request);
    } else {
      errorResponse = this.handleUnknownError(exception, request);
    }

    // Log server errors
    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${errorResponse.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private handleHttpException(exception: HttpException, request: Request): ErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, any>;
      message = responseObj.message || exception.message;
      error = responseObj.error || exception.name;
    } else {
      message = String(exceptionResponse);
      error = exception.name;
    }

    return {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private handlePrismaKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
    request: Request,
  ): ErrorResponse {
    const { code, meta } = exception;
    
    switch (code) {
      // Unique constraint violation
      case 'P2002': {
        const target = meta?.target as string[] | string;
        const field = Array.isArray(target) ? target.join(', ') : target || 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${this.formatFieldName(field)} already exists`,
          error: 'Duplicate Entry',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Foreign key constraint failed
      case 'P2003': {
        const field = meta?.field_name as string || 'reference';
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Invalid ${this.formatFieldName(field)}: The referenced record does not exist`,
          error: 'Foreign Key Constraint Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Record not found (for update/delete)
      case 'P2025': {
        const cause = meta?.cause as string;
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: cause || 'The requested record was not found',
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Required relation violation
      case 'P2014': {
        const relation = meta?.relation_name as string || 'relation';
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Cannot delete or modify: This record is required by another record in ${relation}`,
          error: 'Relation Constraint Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Relation violation - record required to exist
      case 'P2015': {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'A related record could not be found',
          error: 'Related Record Not Found',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Required field missing
      case 'P2011': {
        const constraint = meta?.constraint as string;
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Required field is missing: ${constraint || 'Unknown field'}`,
          error: 'Validation Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Invalid ID type
      case 'P2023': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid ID format provided',
          error: 'Validation Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Connection pool timeout
      case 'P2024': {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection timeout. Please try again.',
          error: 'Service Temporarily Unavailable',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Transaction API error
      case 'P2028': {
        return {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Transaction timed out. Please try again.',
          error: 'Transaction Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Cannot delete parent record
      case 'P2016': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Cannot perform operation: This record has related records that depend on it',
          error: 'Dependency Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Records connected that are not connected
      case 'P2017': {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'The records are not connected',
          error: 'Relation Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      // Connected records not found
      case 'P2018': {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'The required connected records were not found',
          error: 'Not Found',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }

      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Database operation failed: ${exception.message}`,
          error: 'Database Error',
          timestamp: new Date().toISOString(),
          path: request.url,
        };
    }
  }

  private handlePrismaValidationError(
    exception: Prisma.PrismaClientValidationError,
    request: Request,
  ): ErrorResponse {
    // Extract a cleaner message from the validation error
    const message = this.extractValidationMessage(exception.message);
    
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: message || 'Invalid data provided. Please check your request.',
      error: 'Validation Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private handlePrismaInitializationError(
    exception: Prisma.PrismaClientInitializationError,
    request: Request,
  ): ErrorResponse {
    this.logger.error('Prisma initialization error', exception.stack);
    
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Database connection failed. Please try again later.',
      error: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private handleUnknownError(exception: unknown, request: Request): ErrorResponse {
    const message = exception instanceof Error ? exception.message : 'An unexpected error occurred';
    
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: message,
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private formatFieldName(field: string): string {
    // Convert snake_case or camelCase to readable format
    return field
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/  +/g, ' ')
      .trim();
  }

  private extractValidationMessage(errorMessage: string): string {
    // Try to extract the meaningful part from Prisma validation errors
    const lines = errorMessage.split('\n');
    
    // Look for the argument or field that's invalid
    for (const line of lines) {
      if (line.includes('Argument') || line.includes('Invalid')) {
        const cleanedLine = line.trim();
        if (cleanedLine.length > 0 && cleanedLine.length < 200) {
          return cleanedLine;
        }
      }
    }

    // Look for "Unknown arg" patterns
    const unknownArgMatch = errorMessage.match(/Unknown arg `(\w+)`/);
    if (unknownArgMatch) {
      return `Unknown field: ${unknownArgMatch[1]}`;
    }

    // Look for type mismatch
    const typeMismatch = errorMessage.match(/Expected (\w+), provided (\w+)/);
    if (typeMismatch) {
      return `Type error: Expected ${typeMismatch[1]}, but received ${typeMismatch[2]}`;
    }

    return 'Invalid data provided. Please check your request format.';
  }
}

