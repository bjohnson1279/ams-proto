import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[AMS Error Handler]', err);

  const statusCode = err.status || err.statusCode || 500;
  // 🛡️ Sentinel: Sanitize message for 500 errors in production to prevent information leakage
  const isProduction = process.env.NODE_ENV === 'production';
  const isServerError = statusCode >= 500;
  const message = isProduction && isServerError
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error in AMS API');

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
