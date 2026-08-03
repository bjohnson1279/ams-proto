import { Customer, Policy, DeduplicationMatch } from './domain.js';

export type LegacySystemType = 'FORMAT_A' | 'FORMAT_B' | 'FORMAT_C' | 'FORMAT_D';

// Legacy Export Schema Format A (Enterprise Relational SQL JSON Export)
export interface FormatAClientPayload {
  Client_PK: number | string;
  ClientCode: string;
  Insured_Type: 'IND' | 'BUS';
  Entity_Name?: string;
  First_Name?: string;
  Last_Name?: string;
  FEIN_SSN?: string;
  Address_Line_1: string;
  Address_Line_2?: string;
  City: string;
  State: string;
  Postal_Code: string;
  Email_Addr?: string;
  Phone_Num?: string;
  Status_Code: string;
  Policies?: Array<{
    Policy_ID_FK: string;
    Policy_Num: string;
    Line_Of_Business_Code: string; // e.g., 'AUTOC', 'GL', 'PROP', 'WORK'
    Effective_Dt: string; // MM/DD/YYYY or YYYY-MM-DD
    Expiration_Dt: string;
    Premium_Amt: number;
    Carrier_NAIC?: string;
    Status: string;
  }>;
}

// Legacy Export Schema Format B (Legacy DB-Flat Database Export)
export interface FormatBClientPayload {
  CUST_ID: string;
  CLIENT_NO: number;
  CUST_TYPE: 'B' | 'I'; // B = Business, I = Individual
  BUS_NAME?: string;
  FIRST_NM?: string;
  LAST_NM?: string;
  SSN_FEIN?: string;
  ADDR1: string;
  CITY: string;
  ST: string;
  ZIP: string;
  E_MAIL?: string;
  TELEPHONE?: string;
  POLICIES?: Array<{
    POL_ID: string;
    POL_NUM: string;
    LOB_CD: string; // e.g., 'COMAUTO', 'GENLIAB', 'PROPERTY', 'WORKCOMP'
    EFF_DT: string; // YYYYMMDD string format common in legacy DB flat files
    EXP_DT: string;
    PREM_AMT: number;
    NAIC_CD?: string;
    STATUS_CD: string;
  }>;
}

// Legacy Export Schema Format C (Desktop CMS Export)
export interface FormatCClientPayload {
  ClientNum: string;
  FileID: string;
  IsCommercial: boolean;
  BusinessName?: string;
  ContactPerson?: {
    First: string;
    Last: string;
  };
  TaxIdentifier?: string;
  Location: {
    Street: string;
    City: string;
    State: string;
    ZipCode: string;
  };
  Contact: {
    Email: string;
    Phone: string;
  };
  ClientStatus: string;
  PolicyList?: Array<{
    PolicyId: string;
    PolicyNumber: string;
    LOB: string; // e.g. "Commercial Auto", "General Liability"
    EffectiveDate: string; // YYYY-MM-DD
    ExpirationDate: string;
    TotalPremium: number;
    WritingCarrierNAIC?: string;
    PolicyState: string;
  }>;
}

// Legacy Export Schema Format D (Cloud-Native API JSON Stream Export)
export interface FormatDClientPayload {
  account_uuid: string;
  entity_kind: 'ORGANIZATION' | 'PERSON';
  display_name: string;
  legal_name?: string;
  tax_id?: string;
  primary_address: {
    line1: string;
    line2?: string;
    city_name: string;
    state_code: string;
    postal_code: string;
  };
  primary_contact?: {
    email_address: string;
    telephone_number: string;
  };
  account_status: 'ACTIVE' | 'INACTIVE';
  active_policies?: Array<{
    policy_uuid: string;
    policy_num: string;
    product_line_code: string; // e.g., 'COMM_AUTO', 'GEN_LIABILITY', 'WORKERS_COMP'
    start_date: string; // YYYY-MM-DD
    end_date: string;
    annual_premium_cents: number; // Stored in cents (e.g. 500000 = $5,000.00)
    carrier_naic_code?: string;
    billing_method: 'DIRECT_BILL' | 'AGENCY_BILL';
  }>;
}

export interface IngestionPayload {
  systemSource: LegacySystemType;
  exportedAt: string;
  dryRun?: boolean;
  data:
    | FormatAClientPayload
    | FormatBClientPayload
    | FormatCClientPayload
    | FormatDClientPayload
    | Array<FormatAClientPayload | FormatBClientPayload | FormatCClientPayload | FormatDClientPayload>;
}

export interface MappingLogEntry {
  level: 'INFO' | 'WARN' | 'ERROR';
  field: string;
  sourceValue: unknown;
  targetField: string;
  targetValue: unknown;
  message: string;
}

export interface MappingException {
  recordIdentifier: string;
  systemSource: LegacySystemType;
  field: string;
  reason: string;
  severity: 'CRITICAL' | 'NON_CRITICAL';
}

export interface CrosswalkResult {
  systemSource: LegacySystemType;
  ingestedAt: string;
  dryRun?: boolean;
  totalRecordsProcessed: number;
  successfullyTransformedCustomers: number;
  successfullyTransformedPolicies: number;
  deduplicationMatches?: DeduplicationMatch[];
  customers: Customer[];
  policies: Policy[];
  logs: MappingLogEntry[];
  exceptions: MappingException[];
}
