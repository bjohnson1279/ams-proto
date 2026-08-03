import { Customer, DeduplicationMatch } from '../types/domain.js';

export class DeduplicationEngine {
  private existingCustomers: Customer[];

  constructor(existingCustomers: Customer[]) {
    this.existingCustomers = existingCustomers;
  }

  /**
   * Evaluates an incoming candidate customer against pre-existing customers in the AMS store.
   * Returns a match recommendation if confidence meets or exceeds threshold (>= 75%).
   */
  public evaluate(candidate: Customer): DeduplicationMatch | null {
    if (!this.existingCustomers || this.existingCustomers.length === 0) {
      return null;
    }

    const cleanCandidateFein = this.normalizeTaxId(candidate.feinOrSsn);
    const cleanCandidateName = this.normalizeName(
      candidate.businessName || `${candidate.firstName || ''} ${candidate.lastName || ''}`
    );
    const cleanCandidateZip = (candidate.address?.postalCode || '').trim().substring(0, 5);

    let bestMatch: DeduplicationMatch | null = null;
    let highestScore = 0;

    for (const existing of this.existingCustomers) {
      const cleanExistingFein = this.normalizeTaxId(existing.feinOrSsn);
      const cleanExistingName = this.normalizeName(
        existing.businessName || `${existing.firstName || ''} ${existing.lastName || ''}`
      );
      const cleanExistingZip = (existing.address?.postalCode || '').trim().substring(0, 5);

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
