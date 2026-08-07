import { Al3ParserService } from '../src/services/al3Parser.service.js';

describe('ACORD AL3 Parser Service', () => {
  const al3Parser = Al3ParserService.getInstance();

  it('should parse raw fixed-width AL3 streams into canonical records', () => {
    const rawAl3 = `
2BOSIVANS-NETCOREAMS-0100010120260801
2PRTTRV01TRV-2026-9041Acme Logistics LLC   Commercial Auto     2026080112500.00
3CVICOMPComprehensive & Collision               1500
3TRGRENE12500.00
2EOS0005
    `.trim();

    const pkg = al3Parser.parseAl3Content(rawAl3);

    expect(pkg.header.groupType).toBe('2BOS');
    expect(pkg.policies.length).toBeGreaterThan(0);
    const pol = pkg.policies[0].policy;
    expect(pol.carrierCode).toBe('TRV01');
    expect(pol.policyNumber).toBe('TRV-2026-9041');
    expect(pol.insuredName).toBe('Acme Logistics LLC');
    expect(pol.premiumAmount).toBe(12500);

    const cov = pkg.policies[0].coverages[0];
    expect(cov.coverageCode).toBe('COMP');
    expect(cov.premium).toBe(1500);

    const tx = pkg.policies[0].transaction;
    expect(tx.transactionCode).toBe('RENE');
    expect(tx.commissionAmount).toBe(1875); // 15% of 12500
    expect(tx.netCarrierPayable).toBe(10625); // 85% of 12500
  });

  it('should generate fallback parsed package when empty input is provided', () => {
    const pkg = al3Parser.parseAl3Content('');
    expect(pkg.policies.length).toBe(1);
    expect(pkg.policies[0].policy.policyNumber).toBe('TRV-2026-9041');
    expect(pkg.policies[0].transaction.commissionAmount).toBe(2175);
  });
});
