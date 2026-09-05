export type EntityType = 'Individual' | 'Commercial';

export type CustomerStatus = 'Active' | 'Inactive' | 'Prospect';

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  mobile?: string;
}

export interface LegacyCrosswalkRef {
  systemSource: 'FORMAT_A' | 'FORMAT_B' | 'FORMAT_C' | 'FORMAT_D';
  legacyId: string;
  importedAt: string;
}

export interface Customer {
  customerId: string; // Core AMS ID
  tenantId?: string;
  entityType: EntityType;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  dba?: string;
  feinOrSsn: string;
  address: Address;
  contactInfo: ContactInfo;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  legacyCrosswalks?: LegacyCrosswalkRef[];
}

export interface Carrier {
  carrierId: string;
  tenantId?: string;
  carrierName: string;
  naicNumber: string;
  writingCompany: string;
  amBestRating: string;
  contactPhone: string;
  claimsPhone: string;
  website: string;
}

export type LineOfBusiness =
  | 'Commercial Auto'
  | 'General Liability'
  | 'Commercial Property'
  | 'Workers Comp'
  | 'BOP'
  | 'Personal Auto'
  | 'Homeowners';

export type PolicyStatus = 'Active' | 'Expired' | 'Cancelled' | 'Pending';

export interface CoverageItem {
  code: string;
  name: string;
  limitAmount: number;
  deductibleAmount: number;
  premiumAmount: number;
}

export interface VehicleSchedule {
  vehicleId: string;
  policyId: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  garagingZip: string;
  statedValue: number;
}

export interface PropertySchedule {
  propertyId: string;
  policyId: string;
  buildingAddress: string;
  buildingLimit: number;
  contentsLimit: number;
  constructionType: string;
}

export interface DriverSchedule {
  driverId: string;
  customerId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseState: string;
  dateOfBirth: string;
}

export interface Policy {
  policyId: string;
  tenantId?: string;
  policyNumber: string;
  customerId: string;
  carrierId: string;
  lineOfBusiness: LineOfBusiness;
  effectiveDate: string; // ISO 8601 YYYY-MM-DD
  expirationDate: string; // ISO 8601 YYYY-MM-DD
  status: PolicyStatus;
  premiumAmount: number;
  billingType: 'Agency Bill' | 'Direct Bill';
  billingStatus?: 'Unbilled' | 'Invoiced' | 'Paid' | 'Partially_Paid';
  commissionRate?: number; // e.g. 15 for 15%
  coverages: CoverageItem[];
  createdAt: string;
  updatedAt: string;
}


export type ClaimStatus = 'Open' | 'Closed' | 'In_Review' | 'Reopened';

export interface Claim {
  claimId: string;
  claimNumber: string;
  policyId: string;
  customerId: string;
  dateOfLoss: string;
  reportedDate: string;
  status: ClaimStatus;
  lossReserve: number;
  paidAmount: number;
  description: string;
  createdAt: string;
}

export interface DeduplicationMatch {
  matchedCustomerId: string;
  matchedCustomerName: string;
  confidenceScore: number; // 0 to 100
  matchedFields: Array<'FEIN' | 'NAME' | 'ADDRESS'>;
  recommendation: 'LINK_TO_EXISTING' | 'CREATE_NEW';
}

export interface AcordDecPagePayload {
  documentTitle: string;
  acordStandard: string;
  generatedTimestamp: string;
  agencyInfo: {
    agencyName: string;
    agencyCode: string;
    producerName: string;
    licenseNumber: string;
    address: string;
    phone: string;
  };
  insuredHeader: {
    customerId: string;
    name: string;
    entityType: string;
    taxId: string; // FEIN or SSN
    address: string;
    email: string;
    phone: string;
  };
  carrierInfo: {
    carrierId: string;
    carrierName: string;
    naicNumber: string;
    writingCompany: string;
  };
  policySummary: {
    policyId: string;
    policyNumber: string;
    lineOfBusiness: LineOfBusiness;
    effectiveDate: string;
    expirationDate: string;
    termLengthMonths: number;
    status: PolicyStatus;
    billingType: string;
  };
  coverageDetails: Array<{
    coverageCode: string;
    description: string;
    limit: string;
    deductible: string;
    premium: string;
  }>;
  financials: {
    totalPremium: string;
    surplusLinesTax?: string;
    stampedFee?: string;
    totalAmountDue: string;
  };
  formsAndEndorsements: Array<{
    formCode: string;
    editionDate: string;
    title: string;
  }>;
}

// GENERAL LEDGER & SUBSIDIARY LEDGER ACCOUNTING TYPES
export type AccountCategory = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface GlAccount {
  accountNumber: string; // e.g. "1000", "1010", "1200", "2000", "4000"
  accountName: string;   // e.g. "Cash - Operating", "Cash - Premium Trust", "Accounts Receivable"
  category: AccountCategory;
  isTrustAccount?: boolean;
  normalBalance: 'Debit' | 'Credit';
  currentBalance: number;
}

export interface JournalLine {
  accountNumber: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  entryId: string;
  entryDate: string; // ISO YYYY-MM-DD
  reference: string; // e.g. "INV-1001", "PAY-2001", "MANUAL-001"
  memo: string;
  lines: JournalLine[];
  createdAt: string;
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
  accountNumber: string;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  policyId: string;
  issueDate: string;
  dueDate: string;
  grossPremium: number;
  agencyCommissionRate: number; // e.g. 15 (%)
  agencyCommissionAmount: number;
  netCarrierPayable: number;
  status: 'Draft' | 'Posted' | 'Paid' | 'Partially_Paid' | 'Cancelled';
  amountPaid: number;
  balanceDue: number;
  lineItems: InvoiceLineItem[];
  journalEntryId?: string;
  createdAt: string;
}

export interface Payment {
  paymentId: string;
  invoiceId: string;
  customerId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'Check' | 'ACH' | 'Credit_Card' | 'Wire';
  referenceNumber: string;
  depositedToAccount: string; // e.g. "1010" (Trust) or "1000" (Operating)
  createdAt: string;
}

export interface FinancialSummary {
  trialBalance: Array<{
    accountNumber: string;
    accountName: string;
    category: AccountCategory;
    debitBalance: number;
    creditBalance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  metrics: {
    totalAccountsReceivable: number;
    totalCarrierPayables: number;
    operatingCashBalance: number;
    trustCashBalance: number;
    ytdCommissionRevenue: number;
  };
}

// ACORD 25 CERTIFICATE OF INSURANCE TYPES
export interface CertificateHolder {
  holderId: string;
  name: string;
  attention?: string;
  address: Address;
  email: string;
  phone?: string;
  defaultSpecialWording?: string;
  deliveryPreference?: 'Email' | 'Mail' | 'Portal';
  createdAt: string;
  updatedAt: string;
}

export interface Acord25InsurerSlot {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  carrierId: string;
  carrierName: string;
  naicNumber: string;
  writingCompany: string;
}

export interface Acord25GeneralLiability {
  insurerLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  commercialGeneralLiability: boolean;
  claimsMade: boolean;
  occur: boolean;
  addlInsd: boolean;
  subrWvd: boolean;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  limits: {
    eachOccurrence: number;
    damageToRentedPremises: number;
    medExp: number;
    personalAndAdvInjury: number;
    generalAggregate: number;
    productsCompOpAgg: number;
  };
}

export interface Acord25AutoLiability {
  insurerLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  anyAuto: boolean;
  allOwnedAutos: boolean;
  scheduledAutos: boolean;
  hiredAutos: boolean;
  nonOwnedAutos: boolean;
  addlInsd: boolean;
  subrWvd: boolean;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  limits: {
    combinedSingleLimit: number;
    bodilyInjuryPerPerson?: number;
    bodilyInjuryPerAccident?: number;
    propertyDamage?: number;
  };
}

export interface Acord25UmbrellaLiability {
  insurerLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  umbrellaLiab: boolean;
  excessLiab: boolean;
  occur: boolean;
  claimsMade: boolean;
  deductibleAmount?: number;
  retentionAmount?: number;
  addlInsd: boolean;
  subrWvd: boolean;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  limits: {
    eachOccurrence: number;
    aggregate: number;
  };
}

export interface Acord25WorkersComp {
  insurerLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  statutoryLimits: boolean;
  otherLimits: boolean;
  excludedProprietorPartnerOfficer: boolean;
  addlInsd: boolean;
  subrWvd: boolean;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  limits: {
    elEachAccident: number;
    elDiseasePolicyLimit: number;
    elDiseaseEAEmployee: number;
  };
}

export interface Acord25OtherCoverage {
  insurerLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  coverageDescription: string;
  addlInsd: boolean;
  subrWvd: boolean;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  limitsDescription: string;
}

export type CertificateStatus = 'Draft' | 'Issued' | 'Revoked' | 'Expired';

export interface CertificateOfInsurance {
  certificateId: string;
  certificateNumber: string;
  issueDate: string; // YYYY-MM-DD
  status: CertificateStatus;
  producer: {
    agencyName: string;
    producerName: string;
    address: string;
    phone: string;
    email: string;
  };
  insured: {
    customerId: string;
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  insurers: Acord25InsurerSlot[];
  coverages: {
    generalLiability?: Acord25GeneralLiability;
    autoLiability?: Acord25AutoLiability;
    umbrellaLiability?: Acord25UmbrellaLiability;
    workersComp?: Acord25WorkersComp;
    otherCoverages?: Acord25OtherCoverage[];
  };
  descriptionOfOperations: string;
  certificateHolder: CertificateHolder;
  cancellationNoticeDays: number;
  authorizedRepresentative: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificateRequest {
  customerId: string;
  holderId: string;
  policyIds: string[];
  descriptionOfOperations?: string;
  cancellationNoticeDays?: number;
}

export interface BulkIssueCertificateRequest {
  customerId: string;
  holderIds: string[];
  policyIds: string[];
  descriptionOfOperations?: string;
  cancellationNoticeDays?: number;
}


