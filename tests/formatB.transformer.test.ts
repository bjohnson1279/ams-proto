import { transformFormatBPayload } from '../src/transformers/formatB.transformer.js';
import { FormatBClientPayload } from '../src/types/legacy.js';

describe('transformFormatBPayload', () => {
  const existingCarrierNaicMap = new Map<string, string>([
    ['12345', 'CARRIER-123'],
  ]);

  it('should transform a typical commercial Format B payload into canonical models', () => {
    const payload: FormatBClientPayload = {
      CUST_ID: 'B-99182',
      CLIENT_NO: 99182,
      CUST_TYPE: 'B',
      BUS_NAME: 'Acme Corp',
      SSN_FEIN: '12-3456789',
      ADDR1: '123 Business Rd',
      CITY: 'Metropolis',
      ST: 'NY',
      ZIP: '10001',
      E_MAIL: 'contact@acme.com',
      TELEPHONE: '555-1234',
      POLICIES: [
        {
          POL_ID: 'P-101',
          POL_NUM: 'COMAUTO-001',
          LOB_CD: 'COMAUTO',
          EFF_DT: '20230101',
          EXP_DT: '20240101',
          PREM_AMT: 5000,
          NAIC_CD: '12345',
          STATUS_CD: 'ACT',
        }
      ]
    };

    const { customer, policies, logs, exceptions } = transformFormatBPayload(payload, existingCarrierNaicMap);

    expect(customer.entityType).toBe('Commercial');
    expect(customer.businessName).toBe('Acme Corp');
    expect(customer.feinOrSsn).toBe('12-3456789');
    expect(customer.address.street1).toBe('123 Business Rd');

    expect(policies).toHaveLength(1);
    expect(policies[0].lineOfBusiness).toBe('Commercial Auto');
    expect(policies[0].effectiveDate).toBe('2023-01-01');
    expect(policies[0].carrierId).toBe('CARRIER-123');
    expect(policies[0].status).toBe('Active');
    expect(policies[0].premiumAmount).toBe(5000);

    expect(logs.length).toBeGreaterThan(0);
    expect(exceptions).toHaveLength(0);
  });

  it('should transform an individual Format B payload into canonical models', () => {
    const payload: FormatBClientPayload = {
      CUST_ID: 'I-55443',
      CLIENT_NO: 55443,
      CUST_TYPE: 'I',
      FIRST_NM: 'John',
      LAST_NM: 'Doe',
      SSN_FEIN: '987-65-4321',
      ADDR1: '456 Residential St',
      CITY: 'Smalltown',
      ST: 'CA',
      ZIP: '90210'
    };

    const { customer, policies, logs, exceptions } = transformFormatBPayload(payload, existingCarrierNaicMap);

    expect(customer.entityType).toBe('Individual');
    expect(customer.firstName).toBe('John');
    expect(customer.lastName).toBe('Doe');
    expect(customer.feinOrSsn).toBe('987-65-4321');
    expect(customer.address.city).toBe('Smalltown');

    expect(policies).toHaveLength(0);
    expect(logs.length).toBeGreaterThan(0);
    expect(exceptions).toHaveLength(0);
  });

  it('should generate a CRITICAL exception if primary client identifiers are missing', () => {
    const payload = {
      CUST_TYPE: 'B',
      BUS_NAME: 'Ghost Corp',
      ADDR1: 'Unknown',
      CITY: 'Unknown',
      ST: 'XX',
      ZIP: '00000',
    } as unknown as FormatBClientPayload;

    const { exceptions } = transformFormatBPayload(payload, existingCarrierNaicMap);

    expect(exceptions.some(e => e.field === 'CUST_ID / CLIENT_NO' && e.severity === 'CRITICAL')).toBe(true);
  });

  it('should generate a NON_CRITICAL exception if SSN_FEIN is missing', () => {
    const payload = {
      CUST_ID: 'B-99183',
      CLIENT_NO: 99183,
      CUST_TYPE: 'B',
      BUS_NAME: 'Ghost Corp',
      ADDR1: 'Unknown',
      CITY: 'Unknown',
      ST: 'XX',
      ZIP: '00000',
    } as unknown as FormatBClientPayload;

    const { customer, exceptions } = transformFormatBPayload(payload, existingCarrierNaicMap);

    expect(customer.feinOrSsn).toBe('00-0000000');
    expect(exceptions.some(e => e.field === 'SSN_FEIN' && e.severity === 'NON_CRITICAL')).toBe(true);
  });

  it('should transform various LOB codes and parse pre-formatted dates correctly', () => {
    const payload: FormatBClientPayload = {
      CUST_ID: 'B-99184',
      CLIENT_NO: 99184,
      CUST_TYPE: 'B',
      BUS_NAME: 'Multi Policy Corp',
      SSN_FEIN: '12-3456789',
      ADDR1: '123 Business Rd',
      CITY: 'Metropolis',
      ST: 'NY',
      ZIP: '10001',
      POLICIES: [
        {
          POL_ID: 'P-102',
          POL_NUM: 'GENLIAB-001',
          LOB_CD: 'GENLIAB',
          EFF_DT: '2023-05-01',
          EXP_DT: '2024-05-01',
          PREM_AMT: 2000,
          STATUS_CD: 'ACT',
        },
        {
          POL_ID: 'P-103',
          POL_NUM: 'PROPERTY-001',
          LOB_CD: 'PROPERTY',
          EFF_DT: '2023-06-01',
          EXP_DT: '2024-06-01',
          PREM_AMT: 3000,
          STATUS_CD: 'ACT',
        },
        {
          POL_ID: 'P-104',
          POL_NUM: 'WORKCOMP-001',
          LOB_CD: 'WORKCOMP',
          EFF_DT: '2023/07/01',
          EXP_DT: '2024/07/01',
          PREM_AMT: 4000,
          STATUS_CD: 'ACT',
        },
        {
          POL_ID: 'P-105',
          POL_NUM: 'UNKNOWN-001',
          LOB_CD: 'BOGUS',
          EFF_DT: '2023-08-01',
          EXP_DT: '2024-08-01',
          PREM_AMT: 1000,
          STATUS_CD: 'ACT',
        }
      ]
    };

    const { policies } = transformFormatBPayload(payload, existingCarrierNaicMap);

    expect(policies).toHaveLength(4);

    expect(policies[0].lineOfBusiness).toBe('General Liability');
    expect(policies[0].effectiveDate).toBe('2023-05-01'); // Pre-formatted with hyphen

    expect(policies[1].lineOfBusiness).toBe('Commercial Property');
    expect(policies[1].effectiveDate).toBe('2023-06-01'); // Pre-formatted with hyphen

    expect(policies[2].lineOfBusiness).toBe('Workers Comp');
    expect(policies[2].effectiveDate).toBe('2023/07/01'); // Pre-formatted with slash

    expect(policies[3].lineOfBusiness).toBe('General Liability'); // Default fallback for unknown
    expect(policies[3].effectiveDate).toBe('2023-08-01'); // Pre-formatted with hyphen
  });
});
