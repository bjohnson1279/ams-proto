import { randomInt } from "crypto";
import { Customer, Policy, LineOfBusiness } from '../types/domain.js';
import { FormatCClientPayload, MappingLogEntry, MappingException } from '../types/legacy.js';

export function transformFormatCPayload(
  payload: FormatCClientPayload,
  existingCarrierNaicMap: Map<string, string>
): { customer: Customer; policies: Policy[]; logs: MappingLogEntry[]; exceptions: MappingException[] } {
  const logs: MappingLogEntry[] = [];
  const exceptions: MappingException[] = [];
  const recordId = `FORMAT-C-CLIENT-${payload.ClientNum || payload.FileID || 'UNKNOWN'}`;

  if (!payload.ClientNum && !payload.FileID) {
    exceptions.push({
      recordIdentifier: recordId,
      systemSource: 'FORMAT_C',
      field: 'ClientNum / FileID',
      reason: 'Missing client number or file ID in Format C payload',
      severity: 'CRITICAL'
    });
  }

  const customerId = `CUST-FMT-C-${payload.ClientNum || payload.FileID}`;

  logs.push({
    level: 'INFO',
    field: 'ClientNum',
    sourceValue: payload.ClientNum || payload.FileID,
    targetField: 'customerId',
    targetValue: customerId,
    message: `Crosswalked Format C ClientNum (${payload.ClientNum}) to Core CustomerID ${customerId}`
  });

  const isCommercial = payload.IsCommercial || !!payload.BusinessName;

  const customer: Customer = {
    customerId,
    entityType: isCommercial ? 'Commercial' : 'Individual',
    businessName: isCommercial ? (payload.BusinessName || 'Commercial Entity') : undefined,
    firstName: !isCommercial ? payload.ContactPerson?.First : undefined,
    lastName: !isCommercial ? payload.ContactPerson?.Last : undefined,
    feinOrSsn: payload.TaxIdentifier || '00-0000000',
    address: {
      street1: payload.Location?.Street || 'Street Unspecified',
      city: payload.Location?.City || 'Unknown',
      state: payload.Location?.State || 'XX',
      postalCode: payload.Location?.ZipCode || '00000',
      country: 'USA'
    },
    contactInfo: {
      email: payload.Contact?.Email || 'format-c-import@legacy.com',
      phone: payload.Contact?.Phone || '000-000-0000'
    },
    status: payload.ClientStatus === 'Active' ? 'Active' : 'Inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyCrosswalks: [
      {
        systemSource: 'FORMAT_C',
        legacyId: String(payload.ClientNum || payload.FileID),
        importedAt: new Date().toISOString()
      }
    ]
  };

  if (!payload.TaxIdentifier) {
    exceptions.push({
      recordIdentifier: recordId,
      systemSource: 'FORMAT_C',
      field: 'TaxIdentifier',
      reason: 'TaxIdentifier (FEIN/SSN) missing in Format C payload',
      severity: 'NON_CRITICAL'
    });
  }

  const policies: Policy[] = [];

  if (payload.PolicyList && Array.isArray(payload.PolicyList)) {
    for (const rawPol of payload.PolicyList) {
      let lob: LineOfBusiness = 'General Liability';
      const lobText = rawPol.LOB || '';
      if (lobText.includes('Commercial Auto') || lobText.includes('Auto')) {
        lob = 'Commercial Auto';
      } else if (lobText.includes('General Liability') || lobText.includes('Liability')) {
        lob = 'General Liability';
      } else if (lobText.includes('Property')) {
        lob = 'Commercial Property';
      } else if (lobText.includes('Workers') || lobText.includes('WC')) {
        lob = 'Workers Comp';
      } else if (lobText.includes('BOP')) {
        lob = 'BOP';
      }

      logs.push({
        level: 'INFO',
        field: 'LOB',
        sourceValue: rawPol.LOB,
        targetField: 'lineOfBusiness',
        targetValue: lob,
        message: `Mapped Format C LOB description '${rawPol.LOB}' to canonical LOB '${lob}'`
      });

      const carrierId = (rawPol.WritingCarrierNAIC && existingCarrierNaicMap.get(rawPol.WritingCarrierNAIC)) || 'CARRIER-003';

      const policy: Policy = {
        policyId: `POL-FMT-C-${rawPol.PolicyId || randomInt(100000)}`,
        policyNumber: rawPol.PolicyNumber || `FMT-C-${Date.now()}`,
        customerId,
        carrierId,
        lineOfBusiness: lob,
        effectiveDate: rawPol.EffectiveDate,
        expirationDate: rawPol.ExpirationDate,
        status: rawPol.PolicyState === 'Active' ? 'Active' : 'Expired',
        premiumAmount: Number(rawPol.TotalPremium) || 0,
        billingType: 'Agency Bill',
        coverages: [
          {
            code: 'FMT_C_COV',
            name: `${lob} Primary Schedule`,
            limitAmount: 1000000,
            deductibleAmount: 1000,
            premiumAmount: Number(rawPol.TotalPremium) || 0
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
