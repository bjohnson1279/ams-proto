import { transformFormatCPayload } from '../src/transformers/formatC.transformer.js';
import { FormatCClientPayload } from '../src/types/legacy.js';

describe('transformFormatCPayload', () => {
  const existingCarrierNaicMap = new Map<string, string>([
    ['12345', 'CARRIER-12345'],
  ]);

  it('should successfully transform a commercial Format C payload into canonical models', () => {
    const payload: FormatCClientPayload = {
      ClientNum: 'C123',
      FileID: 'F123',
      IsCommercial: true,
      BusinessName: 'Test Corp',
      TaxIdentifier: '12-3456789',
      Location: {
        Street: '123 Test St',
        City: 'Testville',
        State: 'TS',
        ZipCode: '12345',
      },
      Contact: {
        Email: 'test@test.com',
        Phone: '123-456-7890',
      },
      ClientStatus: 'Active',
      PolicyList: [
        {
          PolicyId: 'P1',
          PolicyNumber: 'POL-1',
          LOB: 'Commercial Auto',
          EffectiveDate: '2023-01-01',
          ExpirationDate: '2024-01-01',
          TotalPremium: 1000,
          WritingCarrierNAIC: '12345',
          PolicyState: 'Active',
        },
      ],
    };

    const result = transformFormatCPayload(payload, existingCarrierNaicMap);

    expect(result.customer.entityType).toBe('Commercial');
    expect(result.customer.businessName).toBe('Test Corp');
    expect(result.policies[0].lineOfBusiness).toBe('Commercial Auto');
    expect(result.policies[0].carrierId).toBe('CARRIER-12345');
    expect(result.exceptions).toHaveLength(0);
  });

  it('should successfully transform an individual Format C payload', () => {
    const payload: FormatCClientPayload = {
      ClientNum: 'I123',
      FileID: 'F456',
      IsCommercial: false,
      ContactPerson: {
        First: 'John',
        Last: 'Doe',
      },
      TaxIdentifier: '123-45-678',
      Location: {
        Street: '456 Ind St',
        City: 'Indville',
        State: 'IN',
        ZipCode: '54321',
      },
      Contact: {
        Email: 'john@doe.com',
        Phone: '987-654-3210',
      },
      ClientStatus: 'Active',
      PolicyList: [],
    };

    const result = transformFormatCPayload(payload, existingCarrierNaicMap);

    expect(result.customer.entityType).toBe('Individual');
    expect(result.customer.firstName).toBe('John');
    expect(result.customer.lastName).toBe('Doe');
    expect(result.exceptions).toHaveLength(0);
  });

  it('should generate a critical exception if ClientNum and FileID are missing', () => {
    const payload: FormatCClientPayload = {
      ClientNum: '',
      FileID: '',
      IsCommercial: true,
      TaxIdentifier: '12-3456789',
      Location: {
        Street: '123 Test St',
        City: 'Testville',
        State: 'TS',
        ZipCode: '12345',
      },
      Contact: {
        Email: 'test@test.com',
        Phone: '123-456-7890',
      },
      ClientStatus: 'Active',
      PolicyList: [],
    };

    const result = transformFormatCPayload(payload, existingCarrierNaicMap);

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].severity).toBe('CRITICAL');
    expect(result.exceptions[0].field).toBe('ClientNum / FileID');
  });

  it('should generate a non-critical exception if TaxIdentifier is missing', () => {
    const payload: FormatCClientPayload = {
      ClientNum: 'C123',
      FileID: 'F123',
      IsCommercial: true,
      Location: {
        Street: '123 Test St',
        City: 'Testville',
        State: 'TS',
        ZipCode: '12345',
      },
      Contact: {
        Email: 'test@test.com',
        Phone: '123-456-7890',
      },
      ClientStatus: 'Active',
      PolicyList: [],
    };

    const result = transformFormatCPayload(payload, existingCarrierNaicMap);

    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].severity).toBe('NON_CRITICAL');
    expect(result.exceptions[0].field).toBe('TaxIdentifier');
  });

  it('should map various LOB descriptions to canonical LOBs', () => {
    const payload: FormatCClientPayload = {
      ClientNum: 'C123',
      FileID: 'F123',
      IsCommercial: true,
      TaxIdentifier: '12-3456789',
      ClientStatus: 'Active',
      PolicyList: [
        { PolicyId: 'P1', LOB: 'General Liability' },
        { PolicyId: 'P2', LOB: 'Liability' },
        { PolicyId: 'P3', LOB: 'Property' },
        { PolicyId: 'P4', LOB: 'Workers Comp' },
        { PolicyId: 'P5', LOB: 'WC' },
        { PolicyId: 'P6', LOB: 'BOP' },
        { PolicyId: 'P7', LOB: 'Unknown LOB' },
      ],
    };

    const result = transformFormatCPayload(payload, existingCarrierNaicMap);

    expect(result.policies).toHaveLength(7);
    expect(result.policies[0].lineOfBusiness).toBe('General Liability');
    expect(result.policies[1].lineOfBusiness).toBe('General Liability');
    expect(result.policies[2].lineOfBusiness).toBe('Commercial Property');
    expect(result.policies[3].lineOfBusiness).toBe('Workers Comp');
    expect(result.policies[4].lineOfBusiness).toBe('Workers Comp');
    expect(result.policies[5].lineOfBusiness).toBe('BOP');
    expect(result.policies[6].lineOfBusiness).toBe('General Liability'); // Default
  });
});
