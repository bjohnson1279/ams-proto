import { IngestionPayload, CrosswalkResult, LegacySystemType, MappingLogEntry, MappingException, FormatAClientPayload, FormatBClientPayload, FormatCClientPayload } from '../types/legacy.js';
import { Customer, Policy, Carrier } from '../types/domain.js';
import { transformFormatAPayload } from './formatA.transformer.js';
import { transformFormatBPayload } from './formatB.transformer.js';
import { transformFormatCPayload } from './formatC.transformer.js';

export class CrosswalkEngine {
  private carrierNaicMap: Map<string, string> = new Map();

  constructor(carriers: Carrier[]) {
    this.updateCarrierMap(carriers);
  }

  public updateCarrierMap(carriers: Carrier[]): void {
    this.carrierNaicMap.clear();
    for (const c of carriers) {
      if (c.naicNumber) {
        this.carrierNaicMap.set(c.naicNumber, c.carrierId);
      }
    }
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

    for (const record of records) {
      try {
        if (source === 'FORMAT_A') {
          const res = transformFormatAPayload(record as FormatAClientPayload, this.carrierNaicMap);
          allCustomers.push(res.customer);
          allPolicies.push(...res.policies);
          allLogs.push(...res.logs);
          allExceptions.push(...res.exceptions);
        } else if (source === 'FORMAT_B') {
          const res = transformFormatBPayload(record as FormatBClientPayload, this.carrierNaicMap);
          allCustomers.push(res.customer);
          allPolicies.push(...res.policies);
          allLogs.push(...res.logs);
          allExceptions.push(...res.exceptions);
        } else if (source === 'FORMAT_C') {
          const res = transformFormatCPayload(record as FormatCClientPayload, this.carrierNaicMap);
          allCustomers.push(res.customer);
          allPolicies.push(...res.policies);
          allLogs.push(...res.logs);
          allExceptions.push(...res.exceptions);
        } else {
          allExceptions.push({
            recordIdentifier: 'UNKNOWN_RECORD',
            systemSource: source || 'FORMAT_A',
            field: 'systemSource',
            reason: `Unsupported or unidentifiable legacy format type: '${source}'`,
            severity: 'CRITICAL'
          });
        }
      } catch (err: any) {
        allExceptions.push({
          recordIdentifier: 'UNHANDLED_EXCEPTION',
          systemSource: source || 'FORMAT_A',
          field: 'GLOBAL',
          reason: `Unhandled parsing exception during transformation: ${err?.message || String(err)}`,
          severity: 'CRITICAL'
        });
      }
    }

    return {
      systemSource: source || 'FORMAT_A',
      ingestedAt: new Date().toISOString(),
      totalRecordsProcessed: records.length,
      successfullyTransformedCustomers: allCustomers.length,
      successfullyTransformedPolicies: allPolicies.length,
      customers: allCustomers,
      policies: allPolicies,
      logs: allLogs,
      exceptions: allExceptions
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
    return 'FORMAT_A';
  }
}
