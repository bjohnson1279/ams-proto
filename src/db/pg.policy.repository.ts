import { IPolicyRepository } from './repository.interfaces.js';
import { Policy } from '../types/domain.js';
import { withTenantTransaction } from './pg.pool.js';
import { randomUUID } from 'crypto';

export class PgPolicyRepository implements IPolicyRepository {
  async getAll(tenantId: string, filter?: any): Promise<Policy[]> {
    return withTenantTransaction(tenantId, async (client) => {
      let query = 'SELECT * FROM policies WHERE tenant_id = $1';
      const values: any[] = [tenantId];
      let paramIndex = 2;

      if (filter) {
        if (filter.customerId) {
          query += ` AND customer_id = $${paramIndex++}`;
          values.push(filter.customerId);
        }
        if (filter.carrierId) {
          query += ` AND carrier_id = $${paramIndex++}`;
          values.push(filter.carrierId);
        }
        if (filter.status) {
          query += ` AND LOWER(policy_status) = LOWER($${paramIndex++})`;
          values.push(filter.status);
        }
        if (filter.effectiveDate) {
          query += ` AND effective_date >= $${paramIndex++}`;
          values.push(filter.effectiveDate);
        }
        if (filter.policyNumber) {
          query += ` AND (LOWER(policy_number) LIKE LOWER($${paramIndex}) OR LOWER(policy_id::text) LIKE LOWER($${paramIndex}))`;
          values.push(`%${filter.policyNumber}%`);
          paramIndex++;
        }
      }

      const res = await client.query(query, values);
      // ⚡ Bolt: Replaced O(N) Array.map() with a pre-allocated native loop to prevent inline closure allocations and improve hot-path performance
      const policies = new Array(res.rows.length);
      for (let i = 0; i < res.rows.length; i++) {
        policies[i] = this.mapToPolicy(res.rows[i]);
      }
      return policies;
    });
  }

  async getById(tenantId: string, id: string): Promise<Policy | null> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM policies WHERE tenant_id = $1 AND policy_id = $2', [tenantId, id]);
      if (res.rows.length === 0) return null;
      return this.mapToPolicy(res.rows[0]);
    });
  }

  async create(tenantId: string, payload: Partial<Policy>): Promise<Policy> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = payload.policyId || randomUUID();
      const res = await client.query(
        `INSERT INTO policies (
          policy_id, tenant_id, customer_id, carrier_id, policy_number, line_of_business,
          effective_date, expiration_date, billing_type, billing_status, policy_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          id, tenantId, payload.customerId, payload.carrierId, payload.policyNumber, payload.lineOfBusiness,
          payload.effectiveDate, payload.expirationDate, payload.billingType, payload.billingStatus, payload.status
        ]
      );
      return this.mapToPolicy(res.rows[0]);
    });
  }

  private mapToPolicy(row: any): Policy {
    return {
      policyId: row.policy_id,
      tenantId: row.tenant_id,
      customerId: row.customer_id,
      carrierId: row.carrier_id,
      policyNumber: row.policy_number,
      lineOfBusiness: row.line_of_business,
      effectiveDate: row.effective_date,
      expirationDate: row.expiration_date,
      status: row.policy_status,
      premiumAmount: parseFloat(row.gross_premium || '0'),
      billingType: row.billing_type,
      billingStatus: row.billing_status,
      coverages: [], // Need separate table or jsonb
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
