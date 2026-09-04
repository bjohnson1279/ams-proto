import { transformFormatAPayload } from '../src/transformers/formatA.transformer.js';
import { FormatAClientPayload } from '../src/types/legacy.js';

describe('Format A Transformer', () => {
  it('should flag a CRITICAL exception when primary client identifiers (Client_PK and ClientCode) are missing', () => {
    // Empty payload missing both Client_PK and ClientCode
    const emptyPayload = {} as FormatAClientPayload;
    const existingCarrierNaicMap = new Map<string, string>();

    const result = transformFormatAPayload(emptyPayload, existingCarrierNaicMap);

    // Verify exceptions array contains the CRITICAL error
    const exception = result.exceptions.find(e => e.field === 'Client_PK / ClientCode');
    expect(exception).toBeDefined();
    expect(exception?.severity).toBe('CRITICAL');
    expect(exception?.reason).toBe('Missing primary client identifier in Format A legacy export record');
    expect(exception?.systemSource).toBe('FORMAT_A');
  });

  it('should transform a payload correctly when Client_PK is provided', () => {
    const payload: FormatAClientPayload = {
      Client_PK: 12345,
      Entity_Name: 'Test Corp',
      FEIN_SSN: '12-3456789',
      Insured_Type: 'BUS'
    };
    const existingCarrierNaicMap = new Map<string, string>();

    const result = transformFormatAPayload(payload, existingCarrierNaicMap);

    // Verify it doesn't have the CRITICAL missing identifier exception
    const exception = result.exceptions.find(e => e.field === 'Client_PK / ClientCode');
    expect(exception).toBeUndefined();

    // Verify the customer was created
    expect(result.customer.customerId).toBe('CUST-FMT-A-12345');
    expect(result.customer.entityType).toBe('Commercial');
    expect(result.customer.businessName).toBe('Test Corp');
  });
});
