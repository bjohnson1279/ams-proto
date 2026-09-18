import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/database.service.js';

export interface TenantRequest extends Request {
  tenantId?: string;
}

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  const headerTenant = req.headers['x-tenant-id'] as string;
  const queryTenant = req.query.tenantId as string;

  const tenantId = headerTenant || queryTenant;

  if (!tenantId) {
    res.status(401).json({
      status: 'error',
      message: 'Missing x-tenant-id header. Cross-tenant authorization bypass prevented.'
    });
    return;
  }

  req.tenantId = tenantId;

  const dbService = DatabaseService.getInstance();
  dbService.setTenantContext(tenantId);
  
  next();
}
