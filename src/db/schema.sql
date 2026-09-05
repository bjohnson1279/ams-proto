-- CoreAMS Multi-Tenant PostgreSQL Schema DDL
-- Standard relational DDL for enterprise multi-tenancy & agency management

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id VARCHAR(64) PRIMARY KEY,
    agency_name VARCHAR(255) NOT NULL,
    fein VARCHAR(20),
    primary_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('Individual', 'Commercial')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    business_name VARCHAR(255),
    dba VARCHAR(255),
    fein_or_ssn VARCHAR(20) NOT NULL,
    street1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'Active',
    legacy_crosswalks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CARRIERS TABLE
CREATE TABLE IF NOT EXISTS carriers (
    carrier_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    carrier_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    naic_number VARCHAR(20),
    am_best_rating VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. POLICIES TABLE
CREATE TABLE IF NOT EXISTS policies (
    policy_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    carrier_id VARCHAR(64) REFERENCES carriers(carrier_id),
    policy_number VARCHAR(100) NOT NULL,
    line_of_business VARCHAR(100) NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    gross_premium NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1500,
    agency_commission NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    net_carrier_payable NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    billing_type VARCHAR(50) DEFAULT 'Agency Bill',
    billing_status VARCHAR(50) DEFAULT 'Unbilled',
    policy_status VARCHAR(50) DEFAULT 'Active',
    coverages JSONB DEFAULT '[]',
    schedules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. DOWNLOAD BATCHES TABLE
CREATE TABLE IF NOT EXISTS download_batches (
    batch_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    carrier_code VARCHAR(50) NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    total_transactions INT DEFAULT 0,
    total_premium NUMERIC(15, 2) DEFAULT 0.00,
    total_commission NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Received',
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE
);

-- 6. DOWNLOAD TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS download_transactions (
    item_id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL REFERENCES download_batches(batch_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    carrier_code VARCHAR(50) NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100) NOT NULL,
    insured_name VARCHAR(255) NOT NULL,
    insured_fein_or_ssn VARCHAR(20),
    line_of_business VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    gross_premium NUMERIC(15, 2) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(15, 2) NOT NULL,
    net_carrier_payable NUMERIC(15, 2) NOT NULL,
    matched_policy_id VARCHAR(64) REFERENCES policies(policy_id),
    matched_customer_id VARCHAR(64) REFERENCES customers(customer_id),
    reconciliation_status VARCHAR(50) DEFAULT 'Matched',
    discrepancy_reason TEXT,
    gl_journal_entry_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. JOURNAL ENTRIES TABLE (GENERAL LEDGER)
CREATE TABLE IF NOT EXISTS journal_entries (
    entry_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    reference_id VARCHAR(100),
    source VARCHAR(100) NOT NULL,
    lines JSONB DEFAULT '[]',
    total_debit NUMERIC(15, 2) NOT NULL,
    total_credit NUMERIC(15, 2) NOT NULL,
    CONSTRAINT check_balanced CHECK (total_debit = total_credit)
);

-- 8. CERTIFICATE HOLDERS TABLE
CREATE TABLE IF NOT EXISTS certificate_holders (
    holder_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    holder_name VARCHAR(255) NOT NULL,
    attention_contact VARCHAR(255),
    street1 VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    default_special_wording TEXT,
    delivery_preference VARCHAR(50) DEFAULT 'PDF Email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE
);

-- 9. CERTIFICATES TABLE (ACORD 25)
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    holder_id VARCHAR(64) NOT NULL REFERENCES certificate_holders(holder_id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Issued',
    producer_name VARCHAR(255) NOT NULL,
    insurers JSONB DEFAULT '[]',
    coverages_snapshot JSONB DEFAULT '{}',
    special_provisions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT
);

-- INDEXES FOR MULTI-TENANT QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_number ON policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_dl_batches_tenant ON download_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dl_tx_tenant ON download_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_tenant ON certificates(tenant_id);
