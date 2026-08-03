import {
  IngestionPayload,
  CrosswalkResult,
  LegacySystemType,
  MappingLogEntry,
  MappingException,
  FormatAClientPayload,
  FormatBClientPayload,
  FormatCClientPayload,
  FormatDClientPayload,
} from '../types/legacy.js';
import { Customer, Policy, Carrier, DeduplicationMatch } from '../types/domain.js';
import { transformFormatAPayload } from './formatA.transformer.js';
import { transformFormatBPayload } from './formatB.transformer.js';
import { transformFormatCPayload } from './formatC.transformer.js';
import { transformFormatDPayload } from './formatD.transformer.js';
import { DeduplicationEngine } from '../services/deduplication.engine.js';

export class CrosswalkEngine {
  private carrierNaicMap: Map<string, string> = new Map();
  private existingCustomersStore: Customer[] = [];

  constructor(carriers: Carrier[], existingCustomers: Customer[] = []) {
    this.updateCarrierMap(carriers);
    this.existingCustomersStore = existingCustomers;
  }

  public updateCarrierMap(carriers: Carrier[]): void {
    this.carrierNaicMap.clear();
    for (const c of carriers) {
      if (c.naicNumber) {
        this.carrierNaicMap.set(c.naicNumber, c.carrierId);
      }
    }
  }

  public updateExistingCustomers(existingCustomers: Customer[]): void {
    this.existingCustomersStore = existingCustomers;
  }

  public processIngestion(payload: IngestionPayload): CrosswalkResult {
    let source: LegacySystemType = payload.systemSource;
    const rawData = payload.data;
    const records = Array.isArray(rawData) ? rawData : [rawData];

    if (!source && records.length > 0) {
      source = this.detectSystemSource(records[0]);
    }

    const allCustomers: Customer[] = [];
    const allPolicies: Policy[] = [];
    const allLogs: MappingLogEntry[] = [];
    const allExceptions: MappingException[] = [];
    const deduplicationMatches: DeduplicationMatch[] = [];

    const dedupEngine = new DeduplicationEngine(this.existingCustomersStore);

    for (const record of records) {
      try {
        let transformedCustomer: Customer | undefined;
        let transformedPolicies: Policy[] = [];
        let logs: MappingLogEntry[] = [];
        let exceptions: MappingException[] = [];

        if (source === 'FORMAT_A') {
          const res = transformFormatAPayload(record as FormatAClientPayload, this.carrierNaicMap);
          transformedCustomer = res.customer;
          transformedPolicies = res.policies;
          logs = res.logs;
          exceptions = res.exceptions;
        } else if (source === 'FORMAT_B') {
          const res = transformFormatBPayload(record as FormatBClientPayload, this.carrierNaicMap);
          transformedCustomer = res.customer;
          transformedPolicies = res.policies;
          logs = res.logs;
          exceptions = res.exceptions;
        } else if (source === 'FORMAT_C') {
          const res = transformFormatCPayload(record as FormatCClientPayload, this.carrierNaicMap);
          transformedCustomer = res.customer;
          transformedPolicies = res.policies;
          logs = res.logs;
          exceptions = res.exceptions;
        } else if (source === 'FORMAT_D') {
          const res = transformFormatDPayload(record as FormatDClientPayload, this.carrierNaicMap);
          transformedCustomer = res.customer;
          transformedPolicies = res.policies;
          logs = res.logs;
          exceptions = res.exceptions;
        } else {
          allExceptions.push({
            recordIdentifier: 'UNKNOWN_RECORD',
            systemSource: source || 'FORMAT_A',
            field: 'systemSource',
            reason: `Unsupported or unidentifiable legacy format type: '${source}'`,
            severity: 'CRITICAL',
          });
        }

        if (transformedCustomer) {
          // Check for deduplication match against pre-existing store
          const match = dedupEngine.evaluate(transformedCustomer);
          if (match) {
            deduplicationMatches.push(match);
            logs.push({
              level: 'WARN',
              field: 'feinOrSsn / businessName',
              sourceValue: transformedCustomer.feinOrSsn,
              targetField: 'customerId',
              targetValue: match.matchedCustomerId,
              message: `Deduplication Alert (${match.confidenceScore}% Confidence): Candidate matches existing Core Customer '${match.matchedCustomerName}' (${match.matchedCustomerId}). Recommendation: ${match.recommendation}`,
            });

            // If dryRun or linking, link transformed policies to matched existing customer
            if (match.recommendation === 'LINK_TO_EXISTING') {
              for (const pol of transformedPolicies) {
                pol.customerId = match.matchedCustomerId;
              }
            }
          }

          allCustomers.push(transformedCustomer);
          allPolicies.push(...transformedPolicies);
          allLogs.push(...logs);
          allExceptions.push(...exceptions);
        }
      } catch (err: any) {
        allExceptions.push({
          recordIdentifier: 'UNHANDLED_EXCEPTION',
          systemSource: source || 'FORMAT_A',
          field: 'GLOBAL',
          reason: `Unhandled parsing exception during transformation: ${err?.message || String(err)}`,
          severity: 'CRITICAL',
        });
      }
    }

    return {
      systemSource: source || 'FORMAT_A',
      ingestedAt: new Date().toISOString(),
      dryRun: !!payload.dryRun,
      totalRecordsProcessed: records.length,
      successfullyTransformedCustomers: allCustomers.length,
      successfullyTransformedPolicies: allPolicies.length,
      deduplicationMatches,
      customers: allCustomers,
      policies: allPolicies,
      logs: allLogs,
      exceptions: allExceptions,
    };
  }

  private detectSystemSource(record: any): LegacySystemType {
    if ('Client_PK' in record || 'ClientCode' in record) {
      return 'FORMAT_A';
    }
    if ('CUST_ID' in record || 'CLIENT_NO' in record) {
      return 'FORMAT_B';
    }
    if ('ClientNum' in record || 'FileID' in record) {
      return 'FORMAT_C';
    }
    if ('account_uuid' in record || 'entity_kind' in record) {
      return 'FORMAT_D';
    }
    return 'FORMAT_A';
  }
}
