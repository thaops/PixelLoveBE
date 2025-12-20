import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logging Interceptor
 * Logs all incoming API requests with beautiful formatting
 * Includes: method, URL, IP, user agent, body, response time, status code
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip, headers, body } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Get user ID if authenticated
    const userId = (request as any).user?.id || (request as any).user?._id || 'Anonymous';

    // Sanitize sensitive data from body
    const sanitizedBody = this.sanitizeBody(body);

    // Ensure all values have defaults to avoid TypeScript errors
    const safeMethod = method || 'UNKNOWN';
    const safeUrl = originalUrl || '/';
    const safeIp = ip || request.socket.remoteAddress || 'Unknown';
    const safeUserAgent = typeof userAgent === 'string' ? userAgent : 'Unknown';

    // Log incoming request
    this.logRequest(safeMethod, safeUrl, safeIp, safeUserAgent, userId, sanitizedBody);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;
          this.logResponse(safeMethod, safeUrl, statusCode, responseTime, userId, 'Success');
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;
          const errorMessage = error.message || 'Unknown error';
          this.logError(safeMethod, safeUrl, statusCode, responseTime, userId, errorMessage);
        },
      }),
    );
  }

  /**
   * Log incoming request with beautiful format
   */
  private logRequest(
    method: string,
    url: string,
    ip: string,
    userAgent: string,
    userId: string,
    body: any,
  ): void {
    const methodColor = this.getMethodColor(method);
    const methodEmoji = this.getMethodEmoji(method);
    
    this.logger.log(
      `\n${'═'.repeat(80)}\n` +
      `${methodEmoji} ${methodColor}${method.padEnd(7)}\x1b[0m │ ` +
      `\x1b[36m${url}\x1b[0m\n` +
      `${'─'.repeat(80)}\n` +
      `👤 User ID    : \x1b[33m${userId}\x1b[0m\n` +
      `🌐 IP Address : \x1b[35m${ip}\x1b[0m\n` +
      `📱 User Agent : \x1b[90m${userAgent.substring(0, 60)}${userAgent.length > 60 ? '...' : ''}\x1b[0m\n` +
      (Object.keys(body || {}).length > 0
        ? `📦 Body       : \x1b[32m${this.formatBody(body)}\x1b[0m\n`
        : '') +
      `${'─'.repeat(80)}`,
    );
  }

  /**
   * Log successful response
   */
  private logResponse(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId: string,
    message: string,
  ): void {
    const statusColor = this.getStatusColor(statusCode);
    const timeColor = responseTime > 1000 ? '\x1b[31m' : responseTime > 500 ? '\x1b[33m' : '\x1b[32m';
    
    this.logger.log(
      `✅ Response   : ${statusColor}${statusCode}\x1b[0m │ ` +
      `⏱️  Time: ${timeColor}${responseTime}ms\x1b[0m │ ` +
      `👤 User: \x1b[33m${userId}\x1b[0m\n` +
      `${'═'.repeat(80)}\n`,
    );
  }

  /**
   * Log error response
   */
  private logError(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId: string,
    errorMessage: string,
  ): void {
    const statusColor = this.getStatusColor(statusCode);
    
    this.logger.error(
      `\n${'═'.repeat(80)}\n` +
      `❌ Error      : ${statusColor}${statusCode}\x1b[0m │ ` +
      `⏱️  Time: \x1b[31m${responseTime}ms\x1b[0m │ ` +
      `👤 User: \x1b[33m${userId}\x1b[0m\n` +
      `💥 Message    : \x1b[31m${errorMessage}\x1b[0m\n` +
      `${'═'.repeat(80)}\n`,
    );
  }

  /**
   * Get color for HTTP method
   */
  private getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      GET: '\x1b[32m',      // Green
      POST: '\x1b[33m',     // Yellow
      PUT: '\x1b[34m',      // Blue
      PATCH: '\x1b[35m',    // Magenta
      DELETE: '\x1b[31m',   // Red
    };
    return colors[method] || '\x1b[37m'; // White for others
  }

  /**
   * Get emoji for HTTP method
   */
  private getMethodEmoji(method: string): string {
    const emojis: Record<string, string> = {
      GET: '📥',
      POST: '📤',
      PUT: '🔄',
      PATCH: '🔧',
      DELETE: '🗑️',
    };
    return emojis[method] || '📋';
  }

  /**
   * Get color for HTTP status code
   */
  private getStatusColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) {
      return '\x1b[32m'; // Green for success
    } else if (statusCode >= 300 && statusCode < 400) {
      return '\x1b[33m'; // Yellow for redirect
    } else if (statusCode >= 400 && statusCode < 500) {
      return '\x1b[31m'; // Red for client error
    } else {
      return '\x1b[35m'; // Magenta for server error
    }
  }

  /**
   * Format body for logging (truncate if too long)
   */
  private formatBody(body: any): string {
    if (!body || typeof body !== 'object') {
      return String(body);
    }

    const bodyStr = JSON.stringify(body, null, 2);
    const maxLength = 300;
    
    if (bodyStr.length > maxLength) {
      return bodyStr.substring(0, maxLength) + '\n... (truncated)';
    }
    
    return bodyStr;
  }

  /**
   * Sanitize sensitive data from request body
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***HIDDEN***';
      }
    }

    return sanitized;
  }
}

