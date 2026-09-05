import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/database.service.js';

export interface TenantRequest extends Request {
  tenantId?: string;
}

export function tenantMiddleware(req: TenantRequest, _res: Response, next: NextFunction): void {
  const headerTenant = req.headers['x-tenant-id'] as string;
  const queryTenant = req.query.tenantId as string;

  // Scoped tenant default: tenant-001 (Midwest Commercial Agency) or tenant-002 (Coastal Risk Agency)
  const tenantId = headerTenant || queryTenant || 'tenant-001';
  req.tenantId = tenantId;

  const dbService = DatabaseService.getInstance();
  dbService.setTenantContext(tenantId);
  
  next();
}
