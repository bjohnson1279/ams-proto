import request from 'supertest';
import app from '../src/app.js';
import { DatabaseService, REGISTERED_TENANTS } from '../src/services/database.service.js';

describe('Multi-Tenant Row-Level Security & Context Tests', () => {
  const dbService = DatabaseService.getInstance();

  it('should register tenant contexts accurately', () => {
    expect(REGISTERED_TENANTS['tenant-001'].agencyName).toBe('Midwest Commercial Risk Agency');
    expect(REGISTERED_TENANTS['tenant-002'].agencyName).toBe('Coastal Property Risk Partners');
  });

  it('should generate valid PostgreSQL set_config RLS session query', () => {
    const query = dbService.generateRlsSessionQuery('tenant-002');
    expect(query).toBe("SELECT set_config('app.current_tenant_id', 'tenant-002', false);");
  });

  it('should escape single quotes to prevent SQL injection in RLS session query', () => {
    const maliciousTenantId = "tenant-002'; DROP TABLE users; --";
    const query = dbService.generateRlsSessionQuery(maliciousTenantId);
    expect(query).toBe("SELECT set_config('app.current_tenant_id', 'tenant-002''; DROP TABLE users; --', false);");
  });

  it('should extract x-tenant-id header and attach to request context', async () => {
    const res = await request(app)
      .get('/api/v1/customers')
      .set('x-tenant-id', 'tenant-002');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('should filter items by active tenant ID using applyRlsFilter', () => {
    const items = [
      { id: '1', name: 'Item A', tenantId: 'tenant-001' },
      { id: '2', name: 'Item B', tenantId: 'tenant-002' },
      { id: '3', name: 'Item C', tenantId: 'tenant-001' }
    ];

    const tenant1Items = dbService.applyRlsFilter(items, 'tenant-001');
    expect(tenant1Items.length).toBe(2);
    expect(tenant1Items.map(i => i.id)).toEqual(['1', '3']);

    const tenant2Items = dbService.applyRlsFilter(items, 'tenant-002');
    expect(tenant2Items.length).toBe(1);
    expect(tenant2Items[0].id).toBe('2');
  });
});
