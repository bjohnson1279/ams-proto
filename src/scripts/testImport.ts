import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AmsService } from '../services/ams.service.js';
import { IngestionPayload } from '../types/legacy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const formatAPayload = JSON.parse(fs.readFileSync(path.join(rootDir, 'sample_payloads/format_a_payload.json'), 'utf-8'));
const formatBPayload = JSON.parse(fs.readFileSync(path.join(rootDir, 'sample_payloads/format_b_payload.json'), 'utf-8'));
const formatCPayload = JSON.parse(fs.readFileSync(path.join(rootDir, 'sample_payloads/format_c_payload.json'), 'utf-8'));
const formatDPayload = JSON.parse(fs.readFileSync(path.join(rootDir, 'sample_payloads/format_d_payload.json'), 'utf-8'));

function runImportTest() {
  console.log('=== Running Legacy Ingestion Crosswalk Test Suite ===\n');
  const service = AmsService.getInstance();

  console.log('--- 1. Testing Legacy Format A Export Migration ---');
  const resA = service.importLegacyPayload(formatAPayload as unknown as IngestionPayload);
  console.log(`Transformed Customers: ${resA.successfullyTransformedCustomers}`);
  console.log(`Transformed Policies: ${resA.successfullyTransformedPolicies}`);
  console.log('Transformation Field Mapping Logs:');
  resA.logs.forEach(l => console.log(`  [${l.level}] ${l.field} -> ${l.targetField}: ${l.message}`));
  console.log('Mapping Exceptions:');
  resA.exceptions.forEach(e => console.log(`  [${e.severity}] ${e.field}: ${e.reason}`));

  console.log('\n--- 2. Testing Legacy Format B Export Migration ---');
  const resB = service.importLegacyPayload(formatBPayload as unknown as IngestionPayload);
  console.log(`Transformed Customers: ${resB.successfullyTransformedCustomers}`);
  console.log(`Transformed Policies: ${resB.successfullyTransformedPolicies}`);
  console.log('Transformation Field Mapping Logs:');
  resB.logs.forEach(l => console.log(`  [${l.level}] ${l.field} -> ${l.targetField}: ${l.message}`));

  console.log('\n--- 3. Testing Legacy Format C Export Migration ---');
  const resC = service.importLegacyPayload(formatCPayload as unknown as IngestionPayload);
  console.log(`Transformed Customers: ${resC.successfullyTransformedCustomers}`);
  console.log(`Transformed Policies: ${resC.successfullyTransformedPolicies}`);
  console.log('Transformation Field Mapping Logs:');
  resC.logs.forEach(l => console.log(`  [${l.level}] ${l.field} -> ${l.targetField}: ${l.message}`));

  console.log('\n--- 4. Testing Legacy Format D (Cloud JSON Stream) Export Migration ---');
  const resD = service.importLegacyPayload(formatDPayload as unknown as IngestionPayload);
  console.log(`Transformed Customers: ${resD.successfullyTransformedCustomers}`);
  console.log(`Transformed Policies: ${resD.successfullyTransformedPolicies}`);
  console.log('Transformation Field Mapping Logs:');
  resD.logs.forEach(l => console.log(`  [${l.level}] ${l.field} -> ${l.targetField}: ${l.message}`));

  console.log('\n--- 5. Testing Dry-Run Preview Analysis ---');
  const dryRunRes = service.dryRunImport(formatDPayload as unknown as IngestionPayload);
  console.log(`Dry-Run Flag: ${dryRunRes.dryRun}`);
  console.log(`Transformed Customers Preview: ${dryRunRes.successfullyTransformedCustomers}`);

  console.log('\n--- 6. Querying Post-Migration Customer Store ---');
  const allCustomers = service.getCustomers();
  console.log(`Total Customers in AMS Registry: ${allCustomers.length}`);
  allCustomers.forEach(c => {
    console.log(`  - [${c.customerId}] ${c.businessName || `${c.firstName} ${c.lastName}`} (FEIN/SSN: ${c.feinOrSsn})`);
  });

  console.log('\n--- 7. Generating ACORD Dec-Page for Format A Migrated Policy ---');
  const decPage = service.generateDecPage('POL-FMT-A-90214');
  console.log(`Document Title: ${decPage.documentTitle}`);
  console.log(`Insured Name: ${decPage.insuredHeader.name}`);
  console.log(`Policy Number: ${decPage.policySummary.policyNumber}`);
  console.log(`Total Premium: ${decPage.financials.totalPremium}`);

  console.log('\n=== Ingestion Test Suite Execution Completed Successfully ===');
}

runImportTest();
