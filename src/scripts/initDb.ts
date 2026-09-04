import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db/pg.pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runScript(client: any, fileName: string) {
  console.log(`Running script: ${fileName}`);
  const sqlPath = path.join(__dirname, '..', 'db', fileName);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
  console.log(`Successfully executed ${fileName}`);
}

async function initDb() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Core Schema
    await runScript(client, 'schema.sql');

    // 2. RLS Policies
    await runScript(client, 'rls_policies.sql');

    // 3. TimescaleDB Extension (optional, wrap in try/catch in case it's not supported)
    try {
      await runScript(client, 'timescaledb_ledger.sql');
    } catch (err: any) {
      console.warn(`[Warning] Could not initialize TimescaleDB ledger (extension might be missing): ${err.message}`);
    }

    // 4. Seed basic tenants
    console.log('Seeding initial tenants...');
    const tenants = [
      { id: 'tenant-001', name: 'Midwest Commercial Risk Agency', fein: '12-3456789', email: 'admin@midwestrisk.com' },
      { id: 'tenant-002', name: 'Coastal Property Risk Partners', fein: '98-7654321', email: 'admin@coastalrisk.com' }
    ];

    for (const t of tenants) {
      await client.query(
        `INSERT INTO tenants (tenant_id, agency_name, fein, primary_email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id) DO NOTHING`,
        [t.id, t.name, t.fein, t.email]
      );
    }
    
    await client.query('COMMIT');
    console.log('Database initialization complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
