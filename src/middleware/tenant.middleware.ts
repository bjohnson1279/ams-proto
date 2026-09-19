import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/database.service.js';
import { AuthService } from '../services/auth.service.js';

export interface TenantRequest extends Request {
  tenantId?: string;
}

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  // If the route is /api/v1/wsapi, let wsapiAuthMiddleware handle the authentication entirely.
  // We don't want to enforce ticket here and block login endpoints or dual-protect WSAPI.
  if (req.originalUrl.startsWith('/api/v1/wsapi')) {
    // We just set a default tenantId so downstream functions don't crash,
    // though wsapi routes usually read tenantId from req.wsapiSession.tenantId
    req.tenantId = 'tenant-001';
    next();
    return;
  }

  // Extract ticket from header or body for STANDARD API routes
  const ticket =
    (req.headers['x-wsapi-ticket'] as string) ||
    (req.body && typeof req.body.ticket === 'string' ? req.body.ticket : undefined) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.substring(7) : undefined);

  let tenantId: string | undefined;

  if (ticket) {
    const authService = AuthService.getInstance();
    const session = authService.validateTicket(ticket);
    if (session) {
      tenantId = session.tenantId; // Use authenticated tenant ID
    } else {
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired authentication ticket.'
      });
      return;
    }
  } else {
    // Fail securely if no ticket is provided to prevent IDOR on protected routes.
    res.status(401).json({
      status: 'error',
      message: 'Authentication required. Missing valid session ticket.'
    });
    return;
  }

  req.tenantId = tenantId;

  const dbService = DatabaseService.getInstance();
  dbService.setTenantContext(tenantId);
  
  next();
}
