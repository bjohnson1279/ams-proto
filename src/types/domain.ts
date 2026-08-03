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
  policyNumber: string;
  customerId: string;
  carrierId: string;
  lineOfBusiness: LineOfBusiness;
  effectiveDate: string; // ISO 8601 YYYY-MM-DD
  expirationDate: string; // ISO 8601 YYYY-MM-DD
  status: PolicyStatus;
  premiumAmount: number;
  billingType: 'Agency Bill' | 'Direct Bill';
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
