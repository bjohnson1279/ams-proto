import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string;
}

export function tenantMiddleware(req: TenantRequest, _res: Response, next: NextFunction): void {
  const headerTenant = req.headers['x-tenant-id'] as string;
  const queryTenant = req.query.tenantId as string;

  // Scoped tenant default: tenant-001 (Midwest Commercial Agency) or tenant-002 (Coastal Risk Agency)
  req.tenantId = headerTenant || queryTenant || 'tenant-001';
  next();
}
