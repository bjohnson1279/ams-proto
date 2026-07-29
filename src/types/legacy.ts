import { Customer, Policy } from './domain.js';

export type LegacySystemType = 'FORMAT_A' | 'FORMAT_B' | 'FORMAT_C';

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

export interface IngestionPayload {
  systemSource: LegacySystemType;
  exportedAt: string;
  data: FormatAClientPayload | FormatBClientPayload | FormatCClientPayload | Array<FormatAClientPayload | FormatBClientPayload | FormatCClientPayload>;
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
  totalRecordsProcessed: number;
  successfullyTransformedCustomers: number;
  successfullyTransformedPolicies: number;
  customers: Customer[];
  policies: Policy[];
  logs: MappingLogEntry[];
  exceptions: MappingException[];
}
