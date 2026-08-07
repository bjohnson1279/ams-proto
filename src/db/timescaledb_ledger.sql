-- CoreAMS TimescaleDB Audit Hypertable Schema
-- Immutable time-series ledger for auditing financial transactions, AL3 downloads, and crosswalk transformations.

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 1. TIMESCALEDB HYPERTABLE AUDIT LEDGER TABLE
CREATE TABLE IF NOT EXISTS timescale_ledger_audit (
    audit_id UUID DEFAULT gen_random_uuid(),
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(64) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'JOURNAL_ENTRY', 'CARRIER_DOWNLOAD', 'CROSSWALK', 'ACORD_COI'
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'POSTED', 'RECONCILED', 'ISSUED', 'TRANSFORMED'
    gross_amount NUMERIC(15, 2) DEFAULT 0.00,
    commission_amount NUMERIC(15, 2) DEFAULT 0.00,
    actor_id VARCHAR(100) DEFAULT 'system',
    payload_hash VARCHAR(64),
    metadata JSONB,
    PRIMARY KEY (posted_at, audit_id)
);

-- Convert to TimescaleDB Hypertable partitioned by 1-day time chunks
SELECT create_hypertable('timescale_ledger_audit', 'posted_at', if_not_exists => TRUE);

-- Create fast time-series indexes for auditing
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON timescale_ledger_audit (tenant_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON timescale_ledger_audit (entity_type, entity_id);
