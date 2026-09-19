import { CrosswalkEngine } from '../src/transformers/crosswalk.engine.js';
import { Customer, Carrier } from '../src/types/domain.js';
import {
  IngestionPayload,
  FormatAClientPayload,
  FormatBClientPayload,
  FormatCClientPayload,
  FormatDClientPayload,
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

  it('should handle FORMAT_E as unknown and push specific exception details', () => {
    const payload: IngestionPayload = {
      systemSource: 'FORMAT_E' as LegacySystemType,
      exportedAt: new Date().toISOString(),
      data: [{ some_field: '123' } as any],
    };

    const result = engine.processIngestion(payload);

    expect(result.customers).toHaveLength(0);
    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].recordIdentifier).toBe('UNKNOWN_RECORD');
    expect(result.exceptions[0].systemSource).toBe('FORMAT_E');
    expect(result.exceptions[0].field).toBe('systemSource');
    expect(result.exceptions[0].reason).toBe("Unsupported or unidentifiable legacy format type: 'FORMAT_E'");
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

  it('should detect FORMAT_C and successfully transform payload', () => {
    const formatCPayload: FormatCClientPayload = {
      ClientNum: 'C100',
      FileID: 'F100',
      IsCommercial: true,
      BusinessName: 'Format C Corp',
      TaxIdentifier: '11-2223333',
      Location: {
        Street: '123 Format C St',
        City: 'Atlantis',
        State: 'FL',
        ZipCode: '33333',
      },
      Contact: {
        Email: 'contact@formatc.com',
        Phone: '555-5555',
      },
      ClientStatus: 'Active',
      PolicyList: [
        {
          PolicyId: 'P-C1',
          PolicyNumber: 'POL-C-123',
          LOB: 'Commercial Auto',
          EffectiveDate: '2026-01-01',
          ExpirationDate: '2027-01-01',
          TotalPremium: 1500,
          WritingCarrierNAIC: '12345',
          PolicyState: 'Active',
        },
      ],
    };

    const payload: IngestionPayload = {
      systemSource: undefined as unknown as LegacySystemType,
      exportedAt: new Date().toISOString(),
      data: formatCPayload,
    };

    const result = engine.processIngestion(payload);

    expect(result.systemSource).toBe('FORMAT_C');
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].businessName).toBe('Format C Corp');
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].carrierId).toBe('CARRIER-1');
    expect(result.exceptions).toHaveLength(0);
  });

  it('should detect FORMAT_D and successfully transform payload', () => {
    const formatDPayload: FormatDClientPayload = {
      account_uuid: 'acc-uuid-999',
      entity_kind: 'ORGANIZATION',
      display_name: 'Format D LLC',
      legal_name: 'Format D LLC',
      tax_id: '44-5556666',
      primary_address: {
        line1: '999 Format D Ave',
        city_name: 'Seattle',
        state_code: 'WA',
        postal_code: '98101',
      },
      primary_contact: {
        email_address: 'admin@formatd.com',
        telephone_number: '555-9999',
      },
      account_status: 'ACTIVE',
      active_policies: [
        {
          policy_uuid: 'pol-uuid-888',
          policy_num: 'POL-D-456',
          product_line_code: 'COMM_AUTO',
          start_date: '2026-02-01',
          end_date: '2027-02-01',
          annual_premium_cents: 200000,
          carrier_naic_code: '12345',
          billing_method: 'DIRECT_BILL',
        },
      ],
    };

    const payload: IngestionPayload = {
      systemSource: undefined as unknown as LegacySystemType,
      exportedAt: new Date().toISOString(),
      data: formatDPayload,
    };

    const result = engine.processIngestion(payload);

    expect(result.systemSource).toBe('FORMAT_D');
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].businessName).toBe('Format D LLC');
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].carrierId).toBe('CARRIER-1');
    expect(result.exceptions).toHaveLength(0);
  });

  it('should update carrier map properly', () => {
    const newCarriers: Carrier[] = [
      {
        carrierId: 'CARRIER-2',
        naicNumber: '67890',
        carrierName: 'Another Carrier',
        writingCompany: 'Another Co',
        amBestRating: 'A+',
        contactPhone: '555-1111',
        claimsPhone: '555-2222',
        website: 'example2.com',
      }
    ];

    engine.updateCarrierMap(newCarriers);

    const formatAPayload: FormatAClientPayload = {
      Client_PK: 'A-101',
      ClientCode: 'CODE-101',
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
          Policy_ID_FK: 'POL-A-2',
          Policy_Num: 'POL-124',
          Line_Of_Business_Code: 'AUTOC',
          Effective_Dt: '2026-01-01',
          Expiration_Dt: '2027-01-01',
          Premium_Amt: 1000,
          Carrier_NAIC: '67890', // NAIC matching the updated carrier
          Status: 'Active',
        },
      ],
    };

    const payload: IngestionPayload = {
      systemSource: 'FORMAT_A',
      exportedAt: new Date().toISOString(),
      data: formatAPayload,
    };

    const result = engine.processIngestion(payload);

    expect(result.policies[0].carrierId).toBe('CARRIER-2');
  });

  it('should update existing customers for deduplication', () => {
    const newExistingCustomers: Customer[] = [
      {
        customerId: 'CUST-NEW-EXISTING',
        entityType: 'Commercial',
        businessName: 'Format C Corp', // Same as formatCPayload to trigger deduplication
        feinOrSsn: '11-2223333',
        address: {
          street1: '123 Format C St',
          city: 'Atlantis',
          state: 'FL',
          postalCode: '33333',
          country: 'USA',
        },
        contactInfo: {
          email: 'contact@formatc.com',
          phone: '555-5555',
        },
        status: 'Active',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
    ];

    engine.updateExistingCustomers(newExistingCustomers);

    const formatCPayload: FormatCClientPayload = {
      ClientNum: 'C100',
      FileID: 'F100',
      IsCommercial: true,
      BusinessName: 'Format C Corp',
      TaxIdentifier: '11-2223333',
      Location: {
        Street: '123 Format C St',
        City: 'Atlantis',
        State: 'FL',
        ZipCode: '33333',
      },
      Contact: {
        Email: 'contact@formatc.com',
        Phone: '555-5555',
      },
      ClientStatus: 'Active',
      PolicyList: [
        {
          PolicyId: 'P-C1',
          PolicyNumber: 'POL-C-123',
          LOB: 'Commercial Auto',
          EffectiveDate: '2026-01-01',
          ExpirationDate: '2027-01-01',
          TotalPremium: 1500,
          WritingCarrierNAIC: '12345',
          PolicyState: 'Active',
        },
      ],
    };

    const payload: IngestionPayload = {
      systemSource: 'FORMAT_C',
      exportedAt: new Date().toISOString(),
      data: formatCPayload,
    };

    const result = engine.processIngestion(payload);

    expect(result.deduplicationMatches).toHaveLength(1);
    expect(result.deduplicationMatches![0].matchedCustomerId).toBe('CUST-NEW-EXISTING');
  });
});
