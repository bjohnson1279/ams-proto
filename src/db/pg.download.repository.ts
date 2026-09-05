import { IDownloadRepository } from './repository.interfaces.js';
import { withTenantTransaction } from './pg.pool.js';
import { randomUUID } from 'crypto';

export class PgDownloadRepository implements IDownloadRepository {
  async getBatches(tenantId: string): Promise<any[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM download_batches WHERE tenant_id = $1', [tenantId]);
      return res.rows;
    });
  }

  async getBatchById(tenantId: string, id: string): Promise<any | null> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM download_batches WHERE tenant_id = $1 AND batch_id = $2', [tenantId, id]);
      return res.rows[0] || null;
    });
  }

  async createBatch(tenantId: string, batch: any): Promise<any> {
    return withTenantTransaction(tenantId, async (client) => {
      const id = batch.batchId || randomUUID();
      const res = await client.query(
        `INSERT INTO download_batches (batch_id, tenant_id, carrier_code, carrier_name, source, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, tenantId, batch.carrierCode, batch.carrierName, batch.source, batch.status || 'Received']
      );
      return res.rows[0];
    });
  }

  async getTransactions(tenantId: string, batchId: string): Promise<any[]> {
    return withTenantTransaction(tenantId, async (client) => {
      const res = await client.query('SELECT * FROM download_transactions WHERE tenant_id = $1 AND batch_id = $2', [tenantId, batchId]);
      return res.rows;
    });
  }
}
