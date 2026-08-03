import { CertificateService } from '../src/services/certificate.service.js';

describe('CertificateService (ACORD 25 Engine)', () => {
  let certService: CertificateService;

  beforeEach(() => {
    certService = CertificateService.getInstance();
  });

  it('should list initial certificate holders', () => {
    const holders = certService.getCertificateHolders();
    expect(Array.isArray(holders)).toBe(true);
    expect(holders.length).toBeGreaterThanOrEqual(2);
    expect(holders[0].holderId).toBe('HOLDER-1001');
  });

  it('should filter certificate holders by name', () => {
    const results = certService.getCertificateHolders({ name: 'Chicago' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toContain('Chicago');
  });

  it('should create a new certificate holder', () => {
    const newHolder = certService.createCertificateHolder({
      name: 'Metro Construction Authority',
      attention: 'Insurance Desk',
      address: {
        street1: '500 N LaSalle St',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60654',
        country: 'USA'
      },
      email: 'certs@metroconstruction.org'
    });

    expect(newHolder.holderId).toBeDefined();
    expect(newHolder.name).toBe('Metro Construction Authority');
  });

  it('should generate an ACORD 25 Certificate of Insurance', () => {
    const cert = certService.generateCertificate({
      customerId: 'CUST-1001',
      holderId: 'HOLDER-1001',
      policyIds: ['POL-GL-2026-002', 'POL-CA-2026-001'],
      descriptionOfOperations: 'Special Project #9090 - Additional Insured requested.'
    });

    expect(cert.certificateId).toBeDefined();
    expect(cert.insured.customerId).toBe('CUST-1001');
    expect(cert.certificateHolder.holderId).toBe('HOLDER-1001');
    expect(cert.insurers.length).toBeGreaterThanOrEqual(1);
    expect(cert.coverages.generalLiability).toBeDefined();
    expect(cert.descriptionOfOperations).toContain('Special Project #9090');
  });

  it('should bulk issue certificates to multiple holders', () => {
    const issued = certService.bulkIssueCertificates({
      customerId: 'CUST-1001',
      holderIds: ['HOLDER-1001', 'HOLDER-1002'],
      policyIds: ['ALL'],
      descriptionOfOperations: 'Annual Renewal COI Issuance'
    });

    expect(Array.isArray(issued)).toBe(true);
    expect(issued.length).toBe(2);
    expect(issued[0].insured.customerId).toBe('CUST-1001');
    expect(issued[1].insured.customerId).toBe('CUST-1001');
  });

  it('should render ACORD 25 HTML certificate view', () => {
    const html = certService.renderAcord25Html('CERT-2026-001');
    expect(typeof html).toBe('string');
    expect(html).toContain('ACORD 25');
    expect(html).toContain('CERTIFICATE OF LIABILITY INSURANCE');
    expect(html).toContain('Chicago Commercial Properties LLC');
  });

  it('should throw error when rendering non-existent certificate', () => {
    expect(() => {
      certService.renderAcord25Html('CERT-INVALID-999');
    }).toThrow();
  });
});
