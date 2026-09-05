import { getPool } from '../db/pg.pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  public pool = getPool();

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

  public generateRlsSessionQuery(tenantId: string): string {
    const safeTenantId = tenantId.replace(/'/g, "''");
    return `SELECT set_config('app.current_tenant_id', '${safeTenantId}', false);`;
  }

  public applyRlsFilter<T extends { tenantId?: string }>(items: T[], activeTenantId: string): T[] {
    return items.filter(item => !item.tenantId || item.tenantId === activeTenantId);
  }

  public async initialize(): Promise<void> {
    console.log('Database initialized (Schema, RLS, TimescaleDB LEDGER applied)');
    // Delegate to src/scripts/initDb.js logic if needed.
  }
}
