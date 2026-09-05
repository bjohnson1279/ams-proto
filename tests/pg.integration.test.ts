import { getPool } from '../src/db/pg.pool.js';
import { getRepositories } from '../src/db/repository.factory.js';
import { DatabaseService } from '../src/services/database.service.js';
import { randomUUID } from 'crypto';

describe('PostgreSQL RLS Integration Tests', () => {
  let pool: any;

  beforeAll(async () => {
    // Skip tests if no database URL is set (e.g. running in CI without PG)
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping PG integration tests: DATABASE_URL not set');
      return;
    }
    pool = getPool();
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('should enforce tenant isolation (RLS)', async () => {
    if (!process.env.DATABASE_URL) return;

    const repos = getRepositories();
    const tenant1 = 'tenant-001';
    const tenant2 = 'tenant-002';
    const fakeFein = randomUUID().substring(0, 8);

    // Create a customer in tenant 1
    const cust1 = await repos.customers.create(tenant1, {
      entityType: 'Commercial',
      businessName: 'Tenant 1 Business',
      feinOrSsn: fakeFein,
      address: { street1: '123 Main', city: 'City', state: 'IL', postalCode: '60000', country: 'USA' },
      contactInfo: { email: 'test@test.com', phone: '1234567890' },
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legacyCrosswalks: []
    });

    expect(cust1.customerId).toBeDefined();

    // Query customers from tenant 1
    const customers1 = await repos.customers.getAll(tenant1);
    expect(customers1.find(c => c.customerId === cust1.customerId)).toBeDefined();

    // Query customers from tenant 2
    const customers2 = await repos.customers.getAll(tenant2);
    expect(customers2.find(c => c.customerId === cust1.customerId)).toBeUndefined();
  });
});
