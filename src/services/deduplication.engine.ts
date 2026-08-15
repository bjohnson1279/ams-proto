import { Customer, DeduplicationMatch } from '../types/domain.js';

interface CachedCustomer {
  customer: Customer;
  cleanFein: string;
  cleanName: string;
  cleanZip: string;
}

export class DeduplicationEngine {
  // ⚡ Bolt: Cache normalized existing customer fields to avoid O(N*M) recalculations during evaluate
  private existingCustomersCache: CachedCustomer[] = [];

  constructor(existingCustomers: Customer[]) {
    // Pre-calculate normalized fields once instead of in every evaluate() loop
    this.existingCustomersCache = (existingCustomers || []).map(existing => ({
      customer: existing,
      cleanFein: this.normalizeTaxId(existing.feinOrSsn),
      cleanName: this.normalizeName(
        existing.businessName || `${existing.firstName || ''} ${existing.lastName || ''}`
      ),
      cleanZip: (existing.address?.postalCode || '').trim().substring(0, 5)
    }));
  }

  /**
   * Evaluates an incoming candidate customer against pre-existing customers in the AMS store.
   * Returns a match recommendation if confidence meets or exceeds threshold (>= 75%).
   */
  public evaluate(candidate: Customer): DeduplicationMatch | null {
    if (!this.existingCustomersCache || this.existingCustomersCache.length === 0) {
      return null;
    }

    const cleanCandidateFein = this.normalizeTaxId(candidate.feinOrSsn);
    const cleanCandidateName = this.normalizeName(
      candidate.businessName || `${candidate.firstName || ''} ${candidate.lastName || ''}`
    );
    const cleanCandidateZip = (candidate.address?.postalCode || '').trim().substring(0, 5);

    let bestMatch: DeduplicationMatch | null = null;
    let highestScore = 0;

    for (const cached of this.existingCustomersCache) {
      const { customer: existing, cleanFein: cleanExistingFein, cleanName: cleanExistingName, cleanZip: cleanExistingZip } = cached;

      const matchedFields: Array<'FEIN' | 'NAME' | 'ADDRESS'> = [];
      let score = 0;

      // 1. FEIN/SSN Match (Highest weight: 100 points)
      if (cleanCandidateFein && cleanExistingFein && cleanCandidateFein === cleanExistingFein) {
        matchedFields.push('FEIN');
        score += 100;
      }

      // 2. Name Match (Weight: 60 points for exact/close name)
      if (cleanCandidateName && cleanExistingName) {
        if (cleanCandidateName === cleanExistingName) {
          matchedFields.push('NAME');
          score += 60;
        } else if (
          cleanCandidateName.includes(cleanExistingName) ||
          cleanExistingName.includes(cleanCandidateName)
        ) {
          matchedFields.push('NAME');
          score += 40;
        }
      }

      // 3. Address Postal Code Match (Weight: 25 points)
      if (cleanCandidateZip && cleanExistingZip && cleanCandidateZip === cleanExistingZip) {
        matchedFields.push('ADDRESS');
        score += 25;
      }

      const finalScore = Math.min(score, 100);

      if (finalScore >= 75 && finalScore > highestScore) {
        highestScore = finalScore;
        const displayName = existing.businessName || `${existing.firstName || ''} ${existing.lastName || ''}`.trim();
        bestMatch = {
          matchedCustomerId: existing.customerId,
          matchedCustomerName: displayName,
          confidenceScore: finalScore,
          matchedFields,
          recommendation: 'LINK_TO_EXISTING',
        };
      }
    }

    return bestMatch;
  }

  private normalizeTaxId(taxId: string | undefined): string {
    if (!taxId) return '';
    return taxId.replace(/[^0-9]/g, '');
  }

  private normalizeName(name: string | undefined): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/(inc|llc|corp|corporation|ltd|co|company)$/g, '');
  }
}
