import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) ?? randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_SERVER_ERROR';
    let message: string | undefined = 'An unexpected error occurred';
    let details: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exceptionResponse.toUpperCase().replace(/\s+/g, '_');
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        error = (res['error'] as string) ?? String(status);
        message = res['message'] as string | undefined;
        if (Array.isArray(res['message'])) {
          error = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = (res['message'] as string[]).map((msg) => ({
            field: msg.split(' ')[0],
            message: msg,
          }));
        }
        if (res['details']) {
          details = res['details'] as Array<{ field: string; message: string }>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = exception.message;
    }

    response.status(status).json({
      error,
      message,
      ...(details ? { details } : {}),
      requestId,
    });
  }
}
