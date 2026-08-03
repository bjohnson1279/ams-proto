import { FormatDTransformer } from '../src/transformers/formatD.transformer.js';
import { FormatDClientPayload } from '../src/types/legacy.js';

describe('FormatDTransformer', () => {
  const transformer = new FormatDTransformer();

  it('should transform a commercial Format D payload into canonical customer and policy models', () => {
    const payload: FormatDClientPayload = {
      account_uuid: 'acc-cloud-99182',
      entity_kind: 'ORGANIZATION',
      display_name: 'Zenith Logistics & Transport',
      legal_name: 'Zenith Logistics & Transport Inc',
      tax_id: '47-9021844',
      primary_address: {
        line1: '500 Cloud Commerce Way',
        line2: 'Suite 400',
        city_name: 'Austin',
        state_code: 'TX',
        postal_code: '78701',
      },
      primary_contact: {
        email_address: 'fleet@zenithlogistics.com',
        telephone_number: '512-555-8800',
      },
      account_status: 'ACTIVE',
      active_policies: [
        {
          policy_uuid: 'pol-cloud-101',
          policy_num: 'FMT-D-AUTO-2026',
          product_line_code: 'COMM_AUTO',
          start_date: '2026-03-01',
          end_date: '2027-03-01',
          annual_premium_cents: 4500000, // $45,000.00
          carrier_naic_code: '25674',
          billing_method: 'AGENCY_BILL',
        },
      ],
    };

    const result = transformer.transform(payload);

    expect(result.customer).toBeDefined();
    const cust = result.customer;
    expect(cust.customerId).toBe('CUST-FMT-D-acc-cloud-99182');
    expect(cust.entityType).toBe('Commercial');
    expect(cust.businessName).toBe('Zenith Logistics & Transport Inc');
    expect(cust.feinOrSsn).toBe('47-9021844');
    expect(cust.address.city).toBe('Austin');
    expect(cust.address.state).toBe('TX');

    expect(result.policies).toHaveLength(1);
    const pol = result.policies[0];
    expect(pol.policyNumber).toBe('FMT-D-AUTO-2026');
    expect(pol.lineOfBusiness).toBe('Commercial Auto');
    expect(pol.premiumAmount).toBe(45000.00); // 4500000 cents converted to dollars
    expect(pol.carrierId).toBe('CARRIER-25674');
    expect(pol.billingType).toBe('Agency Bill');
  });

  it('should generate mapping logs and handle missing non-critical fields gracefully', () => {
    const payload: FormatDClientPayload = {
      account_uuid: 'acc-cloud-minimal',
      entity_kind: 'PERSON',
      display_name: 'Alex Mercer',
      primary_address: {
        line1: '123 Pine St',
        city_name: 'Dallas',
        state_code: 'TX',
        postal_code: '75201',
      },
      account_status: 'ACTIVE',
    };

    const result = transformer.transform(payload);
    expect(result.customer).toBeDefined();
    expect(result.customer.firstName).toBe('Alex');
    expect(result.customer.lastName).toBe('Mercer');
    expect(result.logs.some(l => l.field === 'account_uuid')).toBe(true);
  });
});
