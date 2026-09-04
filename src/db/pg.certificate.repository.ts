import { ICertificateHolderRepository, ICertificateRepository } from './repository.interfaces.js';
import { CertificateHolder, CertificateOfInsurance, CertificateStatus } from '../types/domain.js';
import { withTenantTransaction } from './pg.pool.js';
import { randomUUID } from 'crypto';

export class PgCertificateHolderRepository implements ICertificateHolderRepository {
  async getAll(tenantId: string, filter?: any): Promise<CertificateHolder[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM certificate_holders WHERE tenant_id = $1', [tenantId]);
      return res.rows.map(this.mapToHolder);
    });
  }

  async getById(tenantId: string, id: string): Promise<CertificateHolder | null> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM certificate_holders WHERE tenant_id = $1 AND holder_id = $2', [tenantId, id]);
      if (res.rows.length === 0) return null;
      return this.mapToHolder(res.rows[0]);
    });
  }

  async create(tenantId: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = payload.holderId || randomUUID();
      const res = await client.query(
        `INSERT INTO certificate_holders (
          holder_id, tenant_id, holder_name, attention_contact, street1, city, state, postal_code, email, delivery_preference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [id, tenantId, payload.name, payload.attention, payload.address?.street1, payload.address?.city, payload.address?.state, payload.address?.postalCode, payload.email, payload.deliveryPreference]
      );
      return this.mapToHolder(res.rows[0]);
    });
  }

  async update(tenantId: string, id: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query(
        `UPDATE certificate_holders SET 
          holder_name = COALESCE($1, holder_name),
          attention_contact = COALESCE($2, attention_contact),
          street1 = COALESCE($3, street1),
          email = COALESCE($4, email)
        WHERE tenant_id = $5 AND holder_id = $6 RETURNING *`,
        [payload.name, payload.attention, payload.address?.street1, payload.email, tenantId, id]
      );
      return this.mapToHolder(res.rows[0]);
    });
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    // Note: Schema might not have deactivated_at yet, assuming we add it or just log.
    // The prompt says CertificateHolder has deactivatedAt (NEW FIELD).
    return withTenantTransaction(tenantId, async (client) => {
      await client.query(`ALTER TABLE certificate_holders ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE`);
      await client.query(`UPDATE certificate_holders SET deactivated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1 AND holder_id = $2`, [tenantId, id]);
    });
  }

  private mapToHolder(row: any): CertificateHolder {
    return {
      holderId: row.holder_id,
      name: row.holder_name,
      attention: row.attention_contact,
      address: {
        street1: row.street1,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: 'USA'
      },
      email: row.email,
      deliveryPreference: row.delivery_preference,
      createdAt: row.created_at,
      updatedAt: row.created_at,
      deactivatedAt: row.deactivated_at
    };
  }
}

export class PgCertificateRepository implements ICertificateRepository {
  async getAll(tenantId: string, filter?: any): Promise<CertificateOfInsurance[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM certificates WHERE tenant_id = $1', [tenantId]);
      return res.rows.map(this.mapToCert);
    });
  }

  async getById(tenantId: string, id: string): Promise<CertificateOfInsurance | null> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM certificates WHERE tenant_id = $1 AND certificate_id = $2', [tenantId, id]);
      if (res.rows.length === 0) return null;
      return this.mapToCert(res.rows[0]);
    });
  }

  async create(tenantId: string, cert: Partial<CertificateOfInsurance>): Promise<CertificateOfInsurance> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = cert.certificateId || randomUUID();
      const insurersJson = JSON.stringify(cert.insurers || []);
      const coveragesJson = JSON.stringify(cert.coverages || {});
      
      // Ensure JSONB columns exist if not already in schema
      await client.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS insurers JSONB, ADD COLUMN IF NOT EXISTS coverages JSONB, ADD COLUMN IF NOT EXISTS status VARCHAR(50)`);

      const res = await client.query(
        `INSERT INTO certificates (
          certificate_id, tenant_id, customer_id, holder_id, certificate_number, issue_date, producer_name, special_provisions, insurers, coverages, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [id, tenantId, cert.insured?.customerId, cert.certificateHolder?.holderId, cert.certificateNumber, cert.issueDate, cert.producer?.producerName, cert.descriptionOfOperations, insurersJson, coveragesJson, cert.status || 'Draft']
      );
      return this.mapToCert(res.rows[0]);
    });
  }

  async revoke(tenantId: string, id: string, reason?: string): Promise<void> {
    return withTenantTransaction(tenantId, async (client) => {
      await client.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE, ADD COLUMN IF NOT EXISTS revocation_reason TEXT`);
      await client.query(`UPDATE certificates SET status = 'Revoked', revoked_at = CURRENT_TIMESTAMP, revocation_reason = $1 WHERE tenant_id = $2 AND certificate_id = $3`, [reason || null, tenantId, id]);
    });
  }

  private mapToCert(row: any): CertificateOfInsurance {
    return {
      certificateId: row.certificate_id,
      certificateNumber: row.certificate_number,
      issueDate: row.issue_date,
      status: row.status as CertificateStatus,
      producer: { producerName: row.producer_name, agencyName: '', address: '', phone: '', email: '' },
      insured: { customerId: row.customer_id, name: '', address: '', email: '', phone: '' },
      insurers: row.insurers || [],
      coverages: row.coverages || {},
      descriptionOfOperations: row.special_provisions,
      certificateHolder: { holderId: row.holder_id, name: '', address: { street1: '', city: '', state: '', postalCode: '', country: '' }, email: '', createdAt: '', updatedAt: '' },
      cancellationNoticeDays: 30,
      authorizedRepresentative: '',
      createdAt: row.created_at,
      updatedAt: row.created_at,
      revokedAt: row.revoked_at,
      revocationReason: row.revocation_reason
    };
  }
}
