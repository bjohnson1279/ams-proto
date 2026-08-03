import { Customer, Policy, LineOfBusiness } from '../types/domain.js';
import { FormatDClientPayload, MappingLogEntry, MappingException } from '../types/legacy.js';

export class FormatDTransformer {
  public transform(
    payload: FormatDClientPayload,
    existingCarrierNaicMap: Map<string, string> = new Map()
  ): { customer: Customer; policies: Policy[]; logs: MappingLogEntry[]; exceptions: MappingException[] } {
    const logs: MappingLogEntry[] = [];
    const exceptions: MappingException[] = [];
    const recordId = `FORMAT-D-ACCOUNT-${payload.account_uuid || 'UNKNOWN'}`;

    if (!payload.account_uuid) {
      exceptions.push({
        recordIdentifier: recordId,
        systemSource: 'FORMAT_D',
        field: 'account_uuid',
        reason: 'Missing primary account UUID in Format D cloud payload',
        severity: 'CRITICAL',
      });
    }

    const isCommercial = payload.entity_kind === 'ORGANIZATION';
    const customerId = `CUST-FMT-D-${payload.account_uuid}`;

    logs.push({
      level: 'INFO',
      field: 'account_uuid',
      sourceValue: payload.account_uuid,
      targetField: 'customerId',
      targetValue: customerId,
      message: `Crosswalked Format D account_uuid (${payload.account_uuid}) to Core CustomerID ${customerId}`,
    });

    let firstName: string | undefined;
    let lastName: string | undefined;

    if (!isCommercial && payload.display_name) {
      const parts = payload.display_name.trim().split(' ');
      firstName = parts[0] || 'Unknown';
      lastName = parts.slice(1).join(' ') || 'Unknown';
    }

    const customer: Customer = {
      customerId,
      entityType: isCommercial ? 'Commercial' : 'Individual',
      businessName: isCommercial ? (payload.legal_name || payload.display_name) : undefined,
      firstName,
      lastName,
      feinOrSsn: payload.tax_id || '00-0000000',
      address: {
        street1: payload.primary_address?.line1 || 'Address Unspecified',
        street2: payload.primary_address?.line2,
        city: payload.primary_address?.city_name || 'Unknown',
        state: payload.primary_address?.state_code || 'XX',
        postalCode: payload.primary_address?.postal_code || '00000',
        country: 'USA',
      },
      contactInfo: {
        email: payload.primary_contact?.email_address || 'unspecified@legacy-import.com',
        phone: payload.primary_contact?.telephone_number || '000-000-0000',
      },
      status: payload.account_status === 'ACTIVE' ? 'Active' : 'Inactive',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legacyCrosswalks: [
        {
          systemSource: 'FORMAT_D',
          legacyId: payload.account_uuid,
          importedAt: new Date().toISOString(),
        },
      ],
    };

    if (!payload.tax_id) {
      exceptions.push({
        recordIdentifier: recordId,
        systemSource: 'FORMAT_D',
        field: 'tax_id',
        reason: 'tax_id missing in Format D export payload; assigned default placeholder.',
        severity: 'NON_CRITICAL',
      });
    }

    const policies: Policy[] = [];

    if (payload.active_policies && Array.isArray(payload.active_policies)) {
      for (const rawPol of payload.active_policies) {
        const polRecordId = `FORMAT-D-POL-${rawPol.policy_uuid || rawPol.policy_num}`;

        let lob: LineOfBusiness = 'General Liability';
        const prodCode = (rawPol.product_line_code || '').toUpperCase();

        if (prodCode.includes('AUTO') || prodCode === 'COMM_AUTO') {
          lob = 'Commercial Auto';
        } else if (prodCode.includes('LIAB') || prodCode === 'GEN_LIABILITY') {
          lob = 'General Liability';
        } else if (prodCode.includes('PROP') || prodCode === 'COMM_PROP') {
          lob = 'Commercial Property';
        } else if (prodCode.includes('WORK') || prodCode === 'WORKERS_COMP') {
          lob = 'Workers Comp';
        } else if (prodCode.includes('BOP')) {
          lob = 'BOP';
        } else if (prodCode.includes('PERS_AUTO')) {
          lob = 'Personal Auto';
        } else if (prodCode.includes('HOME')) {
          lob = 'Homeowners';
        }

        logs.push({
          level: 'INFO',
          field: 'product_line_code',
          sourceValue: rawPol.product_line_code,
          targetField: 'lineOfBusiness',
          targetValue: lob,
          message: `Mapped Format D product line code '${rawPol.product_line_code}' to canonical LOB '${lob}'`,
        });

        // Format D stores annual premium in cents -> convert to dollars
        const premiumDollars = rawPol.annual_premium_cents ? Number(rawPol.annual_premium_cents) / 100 : 0;

        logs.push({
          level: 'INFO',
          field: 'annual_premium_cents',
          sourceValue: rawPol.annual_premium_cents,
          targetField: 'premiumAmount',
          targetValue: premiumDollars,
          message: `Converted Format D premium cents (${rawPol.annual_premium_cents}) to dollars ($${premiumDollars.toFixed(2)})`,
        });

        const naic = rawPol.carrier_naic_code;
        const carrierId = (naic && (existingCarrierNaicMap.get(naic) || `CARRIER-${naic}`)) || 'CARRIER-001';

        const policy: Policy = {
          policyId: `POL-FMT-D-${rawPol.policy_uuid || Math.floor(Math.random() * 100000)}`,
          policyNumber: rawPol.policy_num || `FMT-D-${Date.now()}`,
          customerId,
          carrierId,
          lineOfBusiness: lob,
          effectiveDate: rawPol.start_date || new Date().toISOString().split('T')[0],
          expirationDate: rawPol.end_date || new Date().toISOString().split('T')[0],
          status: 'Active',
          premiumAmount: premiumDollars,
          billingType: rawPol.billing_method === 'DIRECT_BILL' ? 'Direct Bill' : 'Agency Bill',
          coverages: [
            {
              code: 'BASIC_COV',
              name: `${lob} Primary Coverage`,
              limitAmount: 1000000,
              deductibleAmount: 1000,
              premiumAmount: premiumDollars,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        policies.push(policy);
      }
    }

    return { customer, policies, logs, exceptions };
  }
}

export function transformFormatDPayload(
  payload: FormatDClientPayload,
  existingCarrierNaicMap: Map<string, string> = new Map()
) {
  const transformer = new FormatDTransformer();
  return transformer.transform(payload, existingCarrierNaicMap);
}
