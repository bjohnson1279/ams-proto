import { CrosswalkEngine } from '../src/transformers/crosswalk.engine.js';
import { Customer, Carrier } from '../src/types/domain.js';
import {
  IngestionPayload,
  FormatAClientPayload,
  FormatBClientPayload,
  LegacySystemType
} from '../src/types/legacy.js';
import { jest } from '@jest/globals';

describe('CrosswalkEngine', () => {
  const mockCarriers: Carrier[] = [
    {
      carrierId: 'CARRIER-1',
      naicNumber: '12345',
      carrierName: 'Test Carrier',
      writingCompany: 'Test Co',
      amBestRating: 'A',
      contactPhone: '555-1234',
      claimsPhone: '555-5678',
      website: 'example.com',
    },
  ];

  const mockExistingCustomers: Customer[] = [
    {
      customerId: 'CUST-EXISTING',
      entityType: 'Commercial',
      businessName: 'Acme Corp',
      feinOrSsn: '99-9999999',
      address: {
        street1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
      contactInfo: {
        email: 'info@acme.com',
        phone: '555-0000',
      },
      status: 'Active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  let engine: CrosswalkEngine;

  beforeEach(() => {
    engine = new CrosswalkEngine(mockCarriers, mockExistingCustomers);
    jest.restoreAllMocks();
  });

  it('should detect FORMAT_A and successfully transform payload', () => {
    const formatAPayload: FormatAClientPayload = {
      Client_PK: 'A-100',
      ClientCode: 'CODE-100',
      Insured_Type: 'BUS',
      Entity_Name: 'New Business Inc',
      FEIN_SSN: '12-3456789',
      Address_Line_1: '456 Side St',
      City: 'Gotham',
      State: 'NJ',
      Postal_Code: '07001',
      Status_Code: 'Active',
      Policies: [
        {
          Policy_ID_FK: 'POL-A-1',
          Policy_Num: 'POL-123',
          Line_Of_Business_Code: 'AUTOC',
          Effective_Dt: '2026-01-01',
          Expiration_Dt: '2027-01-01',
          Premium_Amt: 1000,
          Carrier_NAIC: '12345',
          Status: 'Active',
        },
      ],
    };

    const payload: IngestionPayload = {
      systemSource: undefined as unknown as LegacySystemType, // Test detection
      exportedAt: new Date().toISOString(),
      data: formatAPayload,
    };

    const result = engine.processIngestion(payload);

    expect(result.systemSource).toBe('FORMAT_A');
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].businessName).toBe('New Business Inc');
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].carrierId).toBe('CARRIER-1'); // mapped via naicNumber
    expect(result.exceptions).toHaveLength(0);
  });

  it('should detect deduplication match, link policy to existing customer, and return match', () => {
    const formatBPayload: FormatBClientPayload = {
      CUST_ID: 'B-200',
      CLIENT_NO: 200,
      CUST_TYPE: 'B',
      BUS_NAME: 'Acme Corporation', // Slight variation
      SSN_FEIN: '999999999', // Matches existing without hyphen
      ADDR1: '123 Main St',
      CITY: 'Metropolis',
      ST: 'NY',
      ZIP: '10001',
      POLICIES: [
        {
          POL_ID: 'POL-B-1',
          POL_NUM: 'POL-456',
          LOB_CD: 'COMAUTO',
          EFF_DT: '20260101',
          EXP_DT: '20270101',
          PREM_AMT: 2000,
          STATUS_CD: 'A',
        },
      ],
    };

    const payload: IngestionPayload = {
      systemSource: 'FORMAT_B',
      exportedAt: new Date().toISOString(),
      data: formatBPayload,
    };

    const result = engine.processIngestion(payload);

    expect(result.customers).toHaveLength(1); // Still returns transformed customer
    expect(result.deduplicationMatches).toHaveLength(1);
    const match = result.deduplicationMatches![0];
    expect(match.matchedCustomerId).toBe('CUST-EXISTING');
    expect(match.recommendation).toBe('LINK_TO_EXISTING');

    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].customerId).toBe('CUST-EXISTING'); // Linked!
  });

  it('should handle unknown formats and push CRITICAL exception', () => {
    const payload: IngestionPayload = {
      systemSource: 'UNKNOWN_FORMAT' as LegacySystemType,
      exportedAt: new Date().toISOString(),
      data: [{ some_random_field: '123' } as any],
    };

    const result = engine.processIngestion(payload);

    expect(result.customers).toHaveLength(0);
    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].recordIdentifier).toBe('UNKNOWN_RECORD');
    expect(result.exceptions[0].severity).toBe('CRITICAL');
  });

  it('should catch unhandled exceptions during transformation and log UNHANDLED_EXCEPTION', () => {
    // Instead of mocking the import (which is read-only in ES modules),
    // we can pass null or undefined as the data array element,
    // which will cause the object destructuring inside the transformer to throw.
    const payload: IngestionPayload = {
      systemSource: 'FORMAT_A',
      exportedAt: new Date().toISOString(),
      data: [null as unknown as FormatAClientPayload],
    };

    const result = engine.processIngestion(payload);

    expect(result.customers).toHaveLength(0);
    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].recordIdentifier).toBe('UNHANDLED_EXCEPTION');
    expect(result.exceptions[0].severity).toBe('CRITICAL');
    expect(result.exceptions[0].reason).toContain('Cannot read properties of null');
  });
});
