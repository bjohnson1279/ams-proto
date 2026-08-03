import { DeduplicationEngine } from '../src/services/deduplication.engine.js';
import { Customer } from '../src/types/domain.js';

describe('DeduplicationEngine', () => {
  const existingCustomers: Customer[] = [
    {
      customerId: 'CUST-1001',
      entityType: 'Commercial',
      businessName: 'Apex Logistics & Freight LLC',
      feinOrSsn: '12-3456789',
      address: {
        street1: '100 Industrial Pkwy',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      },
      contactInfo: {
        email: 'dispatch@apexlogistics.com',
        phone: '312-555-0199',
      },
      status: 'Active',
      createdAt: '2026-01-15T08:00:00.000Z',
      updatedAt: '2026-01-15T08:00:00.000Z',
    },
    {
      customerId: 'CUST-1002',
      entityType: 'Individual',
      firstName: 'Jane',
      lastName: 'Doe',
      feinOrSsn: '987-65-4321',
      address: {
        street1: '456 Oak Lane',
        city: 'Naperville',
        state: 'IL',
        postalCode: '60540',
        country: 'USA',
      },
      contactInfo: {
        email: 'jane.doe@example.com',
        phone: '630-555-4321',
      },
      status: 'Active',
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: '2026-02-01T10:00:00.000Z',
    },
  ];

  const engine = new DeduplicationEngine(existingCustomers);

  it('should detect an exact FEIN match with 100% confidence', () => {
    const candidate: Customer = {
      customerId: 'CUST-FMT-NEW-01',
      entityType: 'Commercial',
      businessName: 'Apex Logistics',
      feinOrSsn: '12-3456789',
      address: {
        street1: '100 Industrial Pkwy Suite 200',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      },
      contactInfo: { email: 'info@apex.com', phone: '312-555-0199' },
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = engine.evaluate(candidate);
    expect(result).toBeDefined();
    expect(result?.matchedCustomerId).toBe('CUST-1001');
    expect(result?.confidenceScore).toBe(100);
    expect(result?.matchedFields).toContain('FEIN');
    expect(result?.recommendation).toBe('LINK_TO_EXISTING');
  });

  it('should detect name and address match when FEIN differs or is formatted differently', () => {
    const candidate: Customer = {
      customerId: 'CUST-FMT-NEW-02',
      entityType: 'Commercial',
      businessName: 'Apex Logistics & Freight LLC',
      feinOrSsn: '00-0000000', // Different FEIN
      address: {
        street1: '100 Industrial Pkwy',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      },
      contactInfo: { email: 'test@example.com', phone: '312-555-0000' },
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = engine.evaluate(candidate);
    expect(result).toBeDefined();
    expect(result?.matchedCustomerId).toBe('CUST-1001');
    expect(result?.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(result?.matchedFields).toContain('NAME');
    expect(result?.matchedFields).toContain('ADDRESS');
  });

  it('should return null / CREATE_NEW for a unique customer', () => {
    const candidate: Customer = {
      customerId: 'CUST-FMT-NEW-03',
      entityType: 'Commercial',
      businessName: 'Unique Horizon Heavy Industries Inc',
      feinOrSsn: '55-9988776',
      address: {
        street1: '999 New Road',
        city: 'Peoria',
        state: 'IL',
        postalCode: '61602',
        country: 'USA',
      },
      contactInfo: { email: 'contact@uniquehorizon.com', phone: '309-555-1212' },
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = engine.evaluate(candidate);
    expect(result).toBeNull();
  });
});
