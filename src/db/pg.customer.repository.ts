import { ICustomerRepository } from './repository.interfaces.js';
import { Customer } from '../types/domain.js';
import { withTenantTransaction } from './pg.pool.js';
import { randomUUID } from 'crypto';

export class PgCustomerRepository implements ICustomerRepository {
  async getAll(tenantId: string, filter?: any): Promise<Customer[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM customers WHERE tenant_id = $1', [tenantId]);
      return res.rows.map(this.mapToCustomer);
    });
  }

  async getById(tenantId: string, id: string): Promise<Customer | null> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM customers WHERE tenant_id = $1 AND customer_id = $2', [tenantId, id]);
      if (res.rows.length === 0) return null;
      return this.mapToCustomer(res.rows[0]);
    });
  }

  async create(tenantId: string, payload: Partial<Customer>): Promise<Customer> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = payload.customerId || randomUUID();
      const res = await client.query(
        `INSERT INTO customers (
          customer_id, tenant_id, entity_type, first_name, last_name, business_name,
          dba, fein_or_ssn, street1, city, state, postal_code, country, email, phone, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          id, tenantId, payload.entityType, payload.firstName, payload.lastName, payload.businessName,
          payload.dba, payload.feinOrSsn, payload.address?.street1, payload.address?.city, payload.address?.state,
          payload.address?.postalCode, payload.address?.country, payload.contactInfo?.email, payload.contactInfo?.phone, payload.status || 'Active'
        ]
      );
      return this.mapToCustomer(res.rows[0]);
    });
  }

  private mapToCustomer(row: any): Customer {
    return {
      customerId: row.customer_id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      firstName: row.first_name,
      lastName: row.last_name,
      businessName: row.business_name,
      dba: row.dba,
      feinOrSsn: row.fein_or_ssn,
      address: {
        street1: row.street1,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country
      },
      contactInfo: {
        email: row.email,
        phone: row.phone
      },
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
