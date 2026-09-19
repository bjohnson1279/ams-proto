import { transformFormatAPayload } from '../src/transformers/formatA.transformer.js';
import { FormatAClientPayload } from '../src/types/legacy.js';

describe('FormatATransformer', () => {
  const existingCarrierNaicMap = new Map<string, string>();
  existingCarrierNaicMap.set('12345', 'CARRIER-12345');

  it('should transform a commercial Format A payload into canonical customer and policy models', () => {
    const payload: FormatAClientPayload = {
      Client_PK: 1001,
      ClientCode: 'CODE-1001',
      Insured_Type: 'BUS',
      Entity_Name: 'Acme Corp',
      FEIN_SSN: '12-3456789',
      Address_Line_1: '123 Acme Way',
      City: 'Metropolis',
      State: 'NY',
      Postal_Code: '10001',
      Email_Addr: 'info@acmecorp.com',
      Phone_Num: '555-0100',
      Status_Code: 'ACT',
      Policies: [
        {
          Policy_ID_FK: 'P-1001-A',
          Policy_Num: 'POL-AUTO-1001',
          Line_Of_Business_Code: 'AUTOC',
          Effective_Dt: '2023-01-01',
          Expiration_Dt: '2024-01-01',
          Premium_Amt: 1500.50,
          Carrier_NAIC: '12345',
          Status: 'ACT'
        },
        {
          Policy_ID_FK: 'P-1001-B',
          Policy_Num: 'POL-GL-1001',
          Line_Of_Business_Code: 'GL',
          Effective_Dt: '01/15/23',
          Expiration_Dt: '01/15/24',
          Premium_Amt: 2000.00,
          Carrier_NAIC: '12345',
          Status: 'Inactive'
        }
      ]
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    expect(result.customer).toBeDefined();
    const cust = result.customer;
    expect(cust.customerId).toBe('CUST-FMT-A-1001');
    expect(cust.entityType).toBe('Commercial');
    expect(cust.businessName).toBe('Acme Corp');
    expect(cust.firstName).toBeUndefined();
    expect(cust.lastName).toBeUndefined();
    expect(cust.feinOrSsn).toBe('12-3456789');
    expect(cust.address.city).toBe('Metropolis');
    expect(cust.status).toBe('Active');

    expect(result.policies).toHaveLength(2);
    const pol1 = result.policies[0];
    expect(pol1.policyNumber).toBe('POL-AUTO-1001');
    expect(pol1.lineOfBusiness).toBe('Commercial Auto');
    expect(pol1.premiumAmount).toBe(1500.50);
    expect(pol1.carrierId).toBe('CARRIER-12345');
    expect(pol1.effectiveDate).toBe('2023-01-01');
    expect(pol1.status).toBe('Active');

    const pol2 = result.policies[1];
    expect(pol2.policyNumber).toBe('POL-GL-1001');
    expect(pol2.lineOfBusiness).toBe('General Liability');
    expect(pol2.premiumAmount).toBe(2000.00);
    expect(pol2.carrierId).toBe('CARRIER-12345');
    expect(pol2.effectiveDate).toBe('2023-01-15');
    expect(pol2.status).toBe('Expired');
  });

  it('should transform an individual Format A payload', () => {
    const payload: FormatAClientPayload = {
      Client_PK: 2002,
      ClientCode: 'CODE-2002',
      Insured_Type: 'IND',
      First_Name: 'John',
      Last_Name: 'Doe',
      FEIN_SSN: '987-65-4321',
      Address_Line_1: '456 Main St',
      City: 'Smalltown',
      State: 'CA',
      Postal_Code: '90210',
      Status_Code: 'INA'
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    expect(result.customer).toBeDefined();
    const cust = result.customer;
    expect(cust.customerId).toBe('CUST-FMT-A-2002');
    expect(cust.entityType).toBe('Individual');
    expect(cust.firstName).toBe('John');
    expect(cust.lastName).toBe('Doe');
    expect(cust.businessName).toBeUndefined();
    expect(cust.status).toBe('Inactive');
  });

  it('should handle missing primary identifiers (Client_PK & ClientCode) gracefully with CRITICAL exception', () => {
    const payload: FormatAClientPayload = {
      Client_PK: '',
      ClientCode: '',
      Insured_Type: 'IND',
      Address_Line_1: '123 Unknown St',
      City: 'Nowhere',
      State: 'NA',
      Postal_Code: '00000',
      Status_Code: 'ACT'
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    expect(result.exceptions).toBeDefined();
    expect(result.exceptions.length).toBeGreaterThan(0);

    const criticalException = result.exceptions.find(e => e.field === 'Client_PK / ClientCode');
    expect(criticalException).toBeDefined();
    expect(criticalException?.severity).toBe('CRITICAL');
  });

  it('should handle missing FEIN_SSN with a NON_CRITICAL exception', () => {
     const payload: FormatAClientPayload = {
      Client_PK: 3003,
      ClientCode: 'CODE-3003',
      Insured_Type: 'IND',
      First_Name: 'Jane',
      Last_Name: 'Smith',
      Address_Line_1: '789 Oak Ave',
      City: 'Big City',
      State: 'TX',
      Postal_Code: '75001',
      Status_Code: 'ACT'
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    expect(result.customer.feinOrSsn).toBe('00-0000000');
    expect(result.exceptions).toBeDefined();
    const ssnException = result.exceptions.find(e => e.field === 'FEIN_SSN');
    expect(ssnException).toBeDefined();
    expect(ssnException?.severity).toBe('NON_CRITICAL');
  });

  it('should handle missing Carrier_NAIC in policy with a NON_CRITICAL exception and default carrier', () => {
    const payload: FormatAClientPayload = {
      Client_PK: 4004,
      ClientCode: 'CODE-4004',
      Insured_Type: 'BUS',
      Entity_Name: 'Missing Carrier Inc',
      FEIN_SSN: '11-2233445',
      Address_Line_1: '321 Pine Rd',
      City: 'Forest',
      State: 'WA',
      Postal_Code: '98001',
      Status_Code: 'ACT',
      Policies: [
        {
          Policy_ID_FK: 'P-4004-A',
          Policy_Num: 'POL-PROP-4004',
          Line_Of_Business_Code: 'PROP',
          Effective_Dt: '2023-06-01',
          Expiration_Dt: '2024-06-01',
          Premium_Amt: 5000.00,
          Status: 'ACT'
        }
      ]
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    expect(result.policies[0].carrierId).toBe('CARRIER-001');
    expect(result.exceptions).toBeDefined();
    const carrierException = result.exceptions.find(e => e.field === 'Carrier_NAIC');
    expect(carrierException).toBeDefined();
    expect(carrierException?.severity).toBe('NON_CRITICAL');
  });
  it('should handle Workers Comp and BOP LOB codes, and apply default fallbacks for missing fields', () => {
    const payload: FormatAClientPayload = {
      Client_PK: 5005,
      ClientCode: 'CODE-5005',
      Insured_Type: 'BUS',
      Status_Code: 'INA',
      Policies: [
        {
          Policy_ID_FK: 'P-5005-A',
          Policy_Num: 'POL-WC-5005',
          Line_Of_Business_Code: 'WORK',
          Status: 'Inactive'
        },
        {
          Policy_ID_FK: 'P-5005-B',
          Policy_Num: 'POL-BOP-5005',
          Line_Of_Business_Code: 'BOP',
          Effective_Dt: '01/01/2023', // 4 digit year
          Expiration_Dt: '2024-01-01', // no slashes
          Status: 'ACT'
        },
        {
          Policy_ID_FK: 'P-5005-C',
          Policy_Num: 'POL-WC2-5005',
          Line_Of_Business_Code: 'WC'
          // Effective_Dt and Expiration_Dt missing
        },
        {
          // Policy_ID_FK and Policy_Num missing to trigger fallbacks
        }
      ]
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    const cust = result.customer;
    expect(cust.businessName).toBe('Unknown Commercial Entity');
    expect(cust.address.street1).toBe('Address Unspecified');
    expect(cust.address.city).toBe('Unknown');
    expect(cust.address.state).toBe('XX');
    expect(cust.address.postalCode).toBe('00000');
    expect(cust.contactInfo.email).toBe('unspecified@legacy-import.com');
    expect(cust.contactInfo.phone).toBe('000-000-0000');
    expect(cust.status).toBe('Inactive');

    expect(result.policies).toHaveLength(4);

    const wcPol1 = result.policies.find(p => p.policyNumber === 'POL-WC-5005');
    expect(wcPol1?.lineOfBusiness).toBe('Workers Comp');

    const bopPol = result.policies.find(p => p.policyNumber === 'POL-BOP-5005');
    expect(bopPol?.lineOfBusiness).toBe('BOP');
    expect(bopPol?.effectiveDate).toBe('2023-01-01');
    expect(bopPol?.expirationDate).toBe('2024-01-01');

    const wcPol2 = result.policies.find(p => p.policyNumber === 'POL-WC2-5005');
    expect(wcPol2?.lineOfBusiness).toBe('Workers Comp');
    expect(wcPol2?.effectiveDate).toBeDefined(); // defaults to today

    const fallbackPol = result.policies.find(p => p.policyNumber.startsWith('FMT-A-'));
    expect(fallbackPol).toBeDefined();
    expect(fallbackPol?.lineOfBusiness).toBe('General Liability'); // Default
    expect(fallbackPol?.policyId.startsWith('POL-FMT-A-')).toBe(true);
  });

  it('should apply individual default fallbacks for missing names', () => {
    const payload: FormatAClientPayload = {
      Client_PK: 6006,
      Insured_Type: 'IND'
    };

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    const cust = result.customer;
    expect(cust.firstName).toBe('Unknown');
    expect(cust.lastName).toBe('Unknown');
  });

  it('should handle completely empty payload without throwing and return a CRITICAL exception', () => {
    const payload = {} as FormatAClientPayload;
    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    expect(result.exceptions).toBeDefined();
    expect(result.exceptions.length).toBeGreaterThan(0);

    const criticalException = result.exceptions.find(e => e.field === 'Client_PK / ClientCode');
    expect(criticalException).toBeDefined();
    expect(criticalException?.severity).toBe('CRITICAL');
    expect(criticalException?.recordIdentifier).toBe('FORMAT-A-CLIENT-UNKNOWN');
  });
});
