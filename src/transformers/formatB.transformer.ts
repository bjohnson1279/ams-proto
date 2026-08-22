import { randomInt } from "crypto";
import { Customer, Policy, LineOfBusiness } from '../types/domain.js';
import { FormatBClientPayload, MappingLogEntry, MappingException } from '../types/legacy.js';

export function transformFormatBPayload(
  payload: FormatBClientPayload,
  existingCarrierNaicMap: Map<string, string>
): { customer: Customer; policies: Policy[]; logs: MappingLogEntry[]; exceptions: MappingException[] } {
  const logs: MappingLogEntry[] = [];
  const exceptions: MappingException[] = [];
  const recordId = `FORMAT-B-CUST-${payload.CUST_ID || payload.CLIENT_NO || 'UNKNOWN'}`;

  if (!payload.CUST_ID && !payload.CLIENT_NO) {
    exceptions.push({
      recordIdentifier: recordId,
      systemSource: 'FORMAT_B',
      field: 'CUST_ID / CLIENT_NO',
      reason: 'Missing primary client identifier in Format B legacy payload',
      severity: 'CRITICAL'
    });
  }

  const customerId = `CUST-FMT-B-${payload.CUST_ID || payload.CLIENT_NO}`;
  const isCommercial = payload.CUST_TYPE === 'B' || !!payload.BUS_NAME;

  logs.push({
    level: 'INFO',
    field: 'CUST_ID',
    sourceValue: payload.CUST_ID || payload.CLIENT_NO,
    targetField: 'customerId',
    targetValue: customerId,
    message: `Crosswalked Format B CUST_ID (${payload.CUST_ID}) to Core CustomerID ${customerId}`
  });

  const customer: Customer = {
    customerId,
    entityType: isCommercial ? 'Commercial' : 'Individual',
    businessName: isCommercial ? (payload.BUS_NAME || 'Commercial Entity') : undefined,
    firstName: !isCommercial ? (payload.FIRST_NM || 'First') : undefined,
    lastName: !isCommercial ? (payload.LAST_NM || 'Last') : undefined,
    feinOrSsn: payload.SSN_FEIN || '00-0000000',
    address: {
      street1: payload.ADDR1 || 'Address Unspecified',
      city: payload.CITY || 'Unknown',
      state: payload.ST || 'XX',
      postalCode: payload.ZIP || '00000',
      country: 'USA'
    },
    contactInfo: {
      email: payload.E_MAIL || 'format-b-import@legacy-ams.com',
      phone: payload.TELEPHONE || '000-000-0000'
    },
    status: 'Active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyCrosswalks: [
      {
        systemSource: 'FORMAT_B',
        legacyId: String(payload.CUST_ID || payload.CLIENT_NO),
        importedAt: new Date().toISOString()
      }
    ]
  };

  if (!payload.SSN_FEIN) {
    exceptions.push({
      recordIdentifier: recordId,
      systemSource: 'FORMAT_B',
      field: 'SSN_FEIN',
      reason: 'SSN/FEIN missing in Format B record export; defaulted.',
      severity: 'NON_CRITICAL'
    });
  }

  const policies: Policy[] = [];

  if (payload.POLICIES && Array.isArray(payload.POLICIES)) {
    for (const rawPol of payload.POLICIES) {
      let lob: LineOfBusiness = 'General Liability';
      const lobUpper = (rawPol.LOB_CD || '').toUpperCase();
      if (lobUpper.includes('AUTO') || lobUpper === 'COMAUTO') {
        lob = 'Commercial Auto';
      } else if (lobUpper.includes('LIAB') || lobUpper === 'GENLIAB') {
        lob = 'General Liability';
      } else if (lobUpper.includes('PROP') || lobUpper === 'PROPERTY') {
        lob = 'Commercial Property';
      } else if (lobUpper.includes('WORK') || lobUpper === 'WORKCOMP') {
        lob = 'Workers Comp';
      }

      logs.push({
        level: 'INFO',
        field: 'LOB_CD',
        sourceValue: rawPol.LOB_CD,
        targetField: 'lineOfBusiness',
        targetValue: lob,
        message: `Mapped Format B LOB_CD '${rawPol.LOB_CD}' to canonical LOB '${lob}'`
      });

      const effDate = parseFormatBDate(rawPol.EFF_DT);
      const expDate = parseFormatBDate(rawPol.EXP_DT);

      const carrierId = (rawPol.NAIC_CD && existingCarrierNaicMap.get(rawPol.NAIC_CD)) || 'CARRIER-002';

      const policy: Policy = {
        policyId: `POL-FMT-B-${rawPol.POL_ID || randomInt(100000)}`,
        policyNumber: rawPol.POL_NUM || `FMT-B-${Date.now()}`,
        customerId,
        carrierId,
        lineOfBusiness: lob,
        effectiveDate: effDate,
        expirationDate: expDate,
        status: rawPol.STATUS_CD === 'ACT' ? 'Active' : 'Expired',
        premiumAmount: Number(rawPol.PREM_AMT) || 0,
        billingType: 'Direct Bill',
        coverages: [
          {
            code: 'FMT_B_COV',
            name: `${lob} Schedule`,
            limitAmount: 1000000,
            deductibleAmount: 1000,
            premiumAmount: Number(rawPol.PREM_AMT) || 0
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      policies.push(policy);
    }
  }

  return { customer, policies, logs, exceptions };
}

function parseFormatBDate(dt?: string): string {
  if (!dt) return new Date().toISOString().split('T')[0];
  if (dt.length === 8 && !dt.includes('-') && !dt.includes('/')) {
    const y = dt.substring(0, 4);
    const m = dt.substring(4, 6);
    const d = dt.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  return dt;
}
