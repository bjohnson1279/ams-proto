import { Customer, Policy, LineOfBusiness } from '../types/domain.js';
import { FormatAClientPayload, MappingLogEntry, MappingException } from '../types/legacy.js';

export function transformFormatAPayload(
  payload: FormatAClientPayload,
  existingCarrierNaicMap: Map<string, string>
): { customer: Customer; policies: Policy[]; logs: MappingLogEntry[]; exceptions: MappingException[] } {
  const logs: MappingLogEntry[] = [];
  const exceptions: MappingException[] = [];
  const recordId = `FORMAT-A-CLIENT-${payload.Client_PK || payload.ClientCode || 'UNKNOWN'}`;

  if (!payload.Client_PK && !payload.ClientCode) {
    exceptions.push({
      recordIdentifier: recordId,
      systemSource: 'FORMAT_A',
      field: 'Client_PK / ClientCode',
      reason: 'Missing primary client identifier in Format A legacy export record',
      severity: 'CRITICAL'
    });
  }

  const isCommercial = payload.Insured_Type === 'BUS' || !!payload.Entity_Name;
  const customerId = `CUST-FMT-A-${payload.Client_PK || payload.ClientCode}`;

  logs.push({
    level: 'INFO',
    field: 'Client_PK',
    sourceValue: payload.Client_PK,
    targetField: 'customerId',
    targetValue: customerId,
    message: `Crosswalked Format A Client_PK (${payload.Client_PK}) to Core CustomerID ${customerId}`
  });

  const customer: Customer = {
    customerId,
    entityType: isCommercial ? 'Commercial' : 'Individual',
    businessName: isCommercial ? (payload.Entity_Name || 'Unknown Commercial Entity') : undefined,
    firstName: !isCommercial ? (payload.First_Name || 'Unknown') : undefined,
    lastName: !isCommercial ? (payload.Last_Name || 'Unknown') : undefined,
    feinOrSsn: payload.FEIN_SSN || '00-0000000',
    address: {
      street1: payload.Address_Line_1 || 'Address Unspecified',
      street2: payload.Address_Line_2,
      city: payload.City || 'Unknown',
      state: payload.State || 'XX',
      postalCode: payload.Postal_Code || '00000',
      country: 'USA'
    },
    contactInfo: {
      email: payload.Email_Addr || 'unspecified@legacy-import.com',
      phone: payload.Phone_Num || '000-000-0000'
    },
    status: payload.Status_Code === 'ACT' ? 'Active' : 'Inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyCrosswalks: [
      {
        systemSource: 'FORMAT_A',
        legacyId: String(payload.Client_PK || payload.ClientCode),
        importedAt: new Date().toISOString()
      }
    ]
  };

  if (!payload.FEIN_SSN) {
    exceptions.push({
      recordIdentifier: recordId,
      systemSource: 'FORMAT_A',
      field: 'FEIN_SSN',
      reason: 'FEIN/SSN missing in Format A export payload; assigned default placeholder.',
      severity: 'NON_CRITICAL'
    });
  }

  const policies: Policy[] = [];

  if (payload.Policies && Array.isArray(payload.Policies)) {
    for (const rawPol of payload.Policies) {
      const polRecordId = `FORMAT-A-POL-${rawPol.Policy_ID_FK || rawPol.Policy_Num}`;

      let lob: LineOfBusiness = 'General Liability';
      const lobCodeUpper = (rawPol.Line_Of_Business_Code || '').toUpperCase();
      if (lobCodeUpper.includes('AUTO') || lobCodeUpper === 'AUTOC') {
        lob = 'Commercial Auto';
      } else if (lobCodeUpper.includes('GL') || lobCodeUpper === 'LIAB') {
        lob = 'General Liability';
      } else if (lobCodeUpper.includes('PROP')) {
        lob = 'Commercial Property';
      } else if (lobCodeUpper.includes('WORK') || lobCodeUpper === 'WC') {
        lob = 'Workers Comp';
      } else if (lobCodeUpper.includes('BOP')) {
        lob = 'BOP';
      }

      logs.push({
        level: 'INFO',
        field: 'Line_Of_Business_Code',
        sourceValue: rawPol.Line_Of_Business_Code,
        targetField: 'lineOfBusiness',
        targetValue: lob,
        message: `Mapped Format A LOB code '${rawPol.Line_Of_Business_Code}' to canonical LOB '${lob}'`
      });

      const effDate = formatDate(rawPol.Effective_Dt);
      const expDate = formatDate(rawPol.Expiration_Dt);

      const carrierId = (rawPol.Carrier_NAIC && existingCarrierNaicMap.get(rawPol.Carrier_NAIC)) || 'CARRIER-001';
      if (!rawPol.Carrier_NAIC) {
        exceptions.push({
          recordIdentifier: polRecordId,
          systemSource: 'FORMAT_A',
          field: 'Carrier_NAIC',
          reason: 'Carrier NAIC missing in Format A policy payload; mapped to default Carrier CARRIER-001.',
          severity: 'NON_CRITICAL'
        });
      }

      const policy: Policy = {
        policyId: `POL-FMT-A-${rawPol.Policy_ID_FK || Math.floor(Math.random() * 100000)}`,
        policyNumber: rawPol.Policy_Num || `FMT-A-${Date.now()}`,
        customerId,
        carrierId,
        lineOfBusiness: lob,
        effectiveDate: effDate,
        expirationDate: expDate,
        status: (rawPol.Status === 'Active' || rawPol.Status === 'ACT') ? 'Active' : 'Expired',
        premiumAmount: Number(rawPol.Premium_Amt) || 0,
        billingType: 'Agency Bill',
        coverages: [
          {
            code: 'BASIC_COV',
            name: `${lob} Primary Coverage`,
            limitAmount: 1000000,
            deductibleAmount: 1000,
            premiumAmount: Number(rawPol.Premium_Amt) || 0
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

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return dateStr;
}
