-- CoreAMS PostgreSQL Row Level Security (RLS) Policies
-- Enforces absolute multi-tenant data isolation at the database engine layer.

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 2. CREATE RLS POLICIES FOR TENANT ISOLATION

-- Customers Tenant Isolation Policy
DROP POLICY IF EXISTS customer_tenant_isolation ON customers;
CREATE POLICY customer_tenant_isolation ON customers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Carriers Tenant Isolation Policy
DROP POLICY IF EXISTS carrier_tenant_isolation ON carriers;
CREATE POLICY carrier_tenant_isolation ON carriers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Policies Tenant Isolation Policy
DROP POLICY IF EXISTS policy_tenant_isolation ON policies;
CREATE POLICY policy_tenant_isolation ON policies
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Download Batches Tenant Isolation Policy
DROP POLICY IF EXISTS download_batch_tenant_isolation ON download_batches;
CREATE POLICY download_batch_tenant_isolation ON download_batches
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Download Transactions Tenant Isolation Policy
DROP POLICY IF EXISTS download_tx_tenant_isolation ON download_transactions;
CREATE POLICY download_tx_tenant_isolation ON download_transactions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Journal Entries Tenant Isolation Policy
DROP POLICY IF EXISTS journal_entry_tenant_isolation ON journal_entries;
CREATE POLICY journal_entry_tenant_isolation ON journal_entries
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Certificate Holders Tenant Isolation Policy
DROP POLICY IF EXISTS certificate_holder_tenant_isolation ON certificate_holders;
CREATE POLICY certificate_holder_tenant_isolation ON certificate_holders
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Certificates Tenant Isolation Policy
DROP POLICY IF EXISTS certificate_tenant_isolation ON certificates;
CREATE POLICY certificate_tenant_isolation ON certificates
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true));
