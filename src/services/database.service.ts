export interface TenantContext {
  tenantId: string;
  agencyName: string;
}

export const REGISTERED_TENANTS: Record<string, TenantContext> = {
  'tenant-001': {
    tenantId: 'tenant-001',
    agencyName: 'Midwest Commercial Risk Agency'
  },
  'tenant-002': {
    tenantId: 'tenant-002',
    agencyName: 'Coastal Property Risk Partners'
  }
};

export class DatabaseService {
  private static instance: DatabaseService;

  private activeTenantId: string = 'tenant-001';

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public setTenantContext(tenantId: string): void {
    if (!REGISTERED_TENANTS[tenantId]) {
      this.activeTenantId = 'tenant-001';
      return;
    }
    this.activeTenantId = tenantId;
  }

  public getActiveTenantContext(): TenantContext {
    return REGISTERED_TENANTS[this.activeTenantId] || REGISTERED_TENANTS['tenant-001'];
  }

  /**
   * Generates PostgreSQL set_config string for RLS session initialization.
   * Standard syntax: SELECT set_config('app.current_tenant_id', 'tenant-001', false);
   */
  public generateRlsSessionQuery(tenantId: string): string {
    return `SELECT set_config('app.current_tenant_id', '${tenantId}', false);`;
  }

  /**
   * Evaluates whether an entity record belongs to the active RLS tenant context.
   */
  public applyRlsFilter<T extends { tenantId?: string }>(items: T[], activeTenantId: string): T[] {
    return items.filter(item => !item.tenantId || item.tenantId === activeTenantId);
  }
}
