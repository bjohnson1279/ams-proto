import { Customer, Carrier, Policy, Claim, CertificateHolder, CertificateOfInsurance, GlAccount, JournalEntry } from '../types/domain.js';
import { DownloadBatch } from '../types/download.js';

export const INITIAL_CARRIERS: Carrier[] = [
  {
    carrierId: 'CARRIER-001',
    carrierName: 'Travelers Insurance',
    naicNumber: '25658',
    writingCompany: 'Travelers Property Casualty Corp',
    amBestRating: 'A++',
    contactPhone: '1-800-842-5075',
    claimsPhone: '1-800-252-4633',
    website: 'https://www.travelers.com'
  },
  {
    carrierId: 'CARRIER-002',
    carrierName: 'The Hartford',
    naicNumber: '19682',
    writingCompany: 'Hartford Fire Insurance Company',
    amBestRating: 'A+',
    contactPhone: '1-800-624-5578',
    claimsPhone: '1-800-327-3636',
    website: 'https://www.thehartford.com'
  },
  {
    carrierId: 'CARRIER-003',
    carrierName: 'Liberty Mutual Insurance',
    naicNumber: '23046',
    writingCompany: 'Liberty Mutual Fire Insurance Co',
    amBestRating: 'A',
    contactPhone: '1-800-526-1547',
    claimsPhone: '1-800-362-0000',
    website: 'https://www.libertymutual.com'
  },
  {
    carrierId: 'CARRIER-004',
    carrierName: 'Chubb Commercial Insurance',
    naicNumber: '20303',
    writingCompany: 'Great American Insurance Co',
    amBestRating: 'A++',
    contactPhone: '1-800-252-4670',
    claimsPhone: '1-800-433-0385',
    website: 'https://www.chubb.com'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    customerId: 'CUST-1001',
    entityType: 'Commercial',
    businessName: 'Apex Logistics & Freight LLC',
    dba: 'Apex Logistics',
    feinOrSsn: '12-3456789',
    address: {
      street1: '742 Enterprise Way',
      street2: 'Suite 300',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60607',
      country: 'USA'
    },
    contactInfo: {
      email: 'dispatch@apexlogistics.com',
      phone: '312-555-0199',
      mobile: '312-555-0120'
    },
    status: 'Active',
    createdAt: '2025-01-15T08:30:00Z',
    updatedAt: '2026-02-10T14:20:00Z'
  },
  {
    customerId: 'CUST-1002',
    entityType: 'Commercial',
    businessName: 'Vanguard Manufacturing Corp',
    dba: 'Vanguard Industrial',
    feinOrSsn: '98-7654321',
    address: {
      street1: '1200 Industrial Parkway',
      city: 'Cleveland',
      state: 'OH',
      postalCode: '44114',
      country: 'USA'
    },
    contactInfo: {
      email: 'risk@vanguardmfg.com',
      phone: '216-555-4300'
    },
    status: 'Active',
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2026-01-05T11:15:00Z'
  },
  {
    customerId: 'CUST-1003',
    entityType: 'Individual',
    firstName: 'Robert',
    lastName: 'Miller',
    feinOrSsn: '400-12-9876',
    address: {
      street1: '458 Maple Ave',
      city: 'Naperville',
      state: 'IL',
      postalCode: '60540',
      country: 'USA'
    },
    contactInfo: {
      email: 'robert.miller@gmail.com',
      phone: '630-555-8821'
    },
    status: 'Active',
    createdAt: '2025-06-20T09:45:00Z',
    updatedAt: '2026-03-01T16:00:00Z'
  }
];

export const INITIAL_POLICIES: Policy[] = [
  {
    policyId: 'POL-CA-2026-001',
    policyNumber: 'BA-9948210-01',
    customerId: 'CUST-1001',
    carrierId: 'CARRIER-001',
    lineOfBusiness: 'Commercial Auto',
    effectiveDate: '2026-01-01',
    expirationDate: '2027-01-01',
    status: 'Active',
    premiumAmount: 48500.00,
    billingType: 'Agency Bill',
    coverages: [
      {
        code: 'CSL',
        name: 'Combined Single Limit Auto Liability',
        limitAmount: 1000000,
        deductibleAmount: 1000,
        premiumAmount: 32000.00
      },
      {
        code: 'COMP',
        name: 'Comprehensive Coverage (Physical Damage)',
        limitAmount: 500000,
        deductibleAmount: 2500,
        premiumAmount: 9500.00
      },
      {
        code: 'COLL',
        name: 'Collision Coverage',
        limitAmount: 500000,
        deductibleAmount: 2500,
        premiumAmount: 7000.00
      }
    ],
    createdAt: '2025-12-15T10:00:00Z',
    updatedAt: '2025-12-15T10:00:00Z'
  },
  {
    policyId: 'POL-GL-2026-002',
    policyNumber: 'GL-4412093-22',
    customerId: 'CUST-1001',
    carrierId: 'CARRIER-002',
    lineOfBusiness: 'General Liability',
    effectiveDate: '2026-02-01',
    expirationDate: '2027-02-01',
    status: 'Active',
    premiumAmount: 24000.00,
    billingType: 'Direct Bill',
    coverages: [
      {
        code: 'GEN_AGG',
        name: 'General Aggregate Limit',
        limitAmount: 2000000,
        deductibleAmount: 0,
        premiumAmount: 14000.00
      },
      {
        code: 'OCCUR',
        name: 'Each Occurrence Limit',
        limitAmount: 1000000,
        deductibleAmount: 5000,
        premiumAmount: 10000.00
      }
    ],
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z'
  },
  {
    policyId: 'POL-WC-2026-003',
    policyNumber: 'WC-8819203-05',
    customerId: 'CUST-1002',
    carrierId: 'CARRIER-003',
    lineOfBusiness: 'Workers Comp',
    effectiveDate: '2025-07-01',
    expirationDate: '2026-07-01',
    status: 'Active',
    premiumAmount: 38200.00,
    billingType: 'Agency Bill',
    coverages: [
      {
        code: 'WC_STAT',
        name: 'Workers Compensation Statutory Limits',
        limitAmount: 1000000,
        deductibleAmount: 0,
        premiumAmount: 38200.00
      }
    ],
    createdAt: '2025-06-15T09:00:00Z',
    updatedAt: '2025-06-15T09:00:00Z'
  },
  {
    policyId: 'POL-COMM-1001',
    policyNumber: 'POL-COMM-1001',
    customerId: 'CUST-1001',
    carrierId: 'CARRIER-001',
    lineOfBusiness: 'Commercial Auto',
    effectiveDate: '2025-08-01',
    expirationDate: '2026-08-01',
    status: 'Active',
    premiumAmount: 12500.00,
    billingType: 'Direct Bill',
    coverages: [],
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2025-08-01T00:00:00Z'
  }
];

export const INITIAL_CLAIMS: Claim[] = [
  {
    claimId: 'CLM-2026-001',
    claimNumber: 'CLM-90182-X',
    policyId: 'POL-CA-2026-001',
    customerId: 'CUST-1001',
    dateOfLoss: '2026-03-12',
    reportedDate: '2026-03-14',
    status: 'Open',
    lossReserve: 15500.00,
    paidAmount: 2500.00,
    description: 'Minor fender collision involving tractor unit 402 on I-90 eastbound.',
    createdAt: '2026-03-14T14:30:00Z'
  }
];

export const INITIAL_CERTIFICATE_HOLDERS: CertificateHolder[] = [
  {
    holderId: 'HOLDER-1001',
    name: 'Chicago Commercial Properties LLC',
    attention: 'Risk Management Dept - Suite 500',
    address: {
      street1: '200 South Wacker Drive',
      street2: 'Suite 500',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60606',
      country: 'USA'
    },
    email: 'certificates@chicagocommerical.com',
    phone: '312-555-8800',
    defaultSpecialWording: 'Certificate Holder is listed as Additional Insured on General Liability as required by written contract.',
    deliveryPreference: 'Email',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-10T09:00:00Z'
  },
  {
    holderId: 'HOLDER-1002',
    name: 'Midwest Infrastructure & Logistics Partners',
    attention: 'Compliance Manager',
    address: {
      street1: '1500 Michigan Ave',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60605',
      country: 'USA'
    },
    email: 'compliance@midwestinfra.com',
    phone: '312-555-9922',
    defaultSpecialWording: 'Waiver of Subrogation applies in favor of Certificate Holder with respect to General Liability and Workers Compensation.',
    deliveryPreference: 'Email',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z'
  }
];

export const INITIAL_CERTIFICATES: CertificateOfInsurance[] = [
  {
    certificateId: 'CERT-2026-001',
    certificateNumber: 'COI-2026-9901',
    issueDate: '2026-02-15',
    status: 'Issued',
    producer: {
      agencyName: 'Apex Pinnacle Insurance Services, Inc.',
      producerName: 'Sarah Jenkins, CIC',
      address: '100 South Wacker Drive, Suite 1800, Chicago, IL 60606',
      phone: '(312) 555-9000',
      email: 'certificates@apexpinnacle.com'
    },
    insured: {
      customerId: 'CUST-1001',
      name: 'Apex Logistics & Freight LLC',
      address: '742 Enterprise Way, Suite 300, Chicago, IL 60607',
      email: 'dispatch@apexlogistics.com',
      phone: '312-555-0199'
    },
    insurers: [
      {
        letter: 'A',
        carrierId: 'CARRIER-001',
        carrierName: 'Travelers Insurance',
        naicNumber: '25658',
        writingCompany: 'Travelers Property Casualty Corp'
      },
      {
        letter: 'B',
        carrierId: 'CARRIER-002',
        carrierName: 'The Hartford',
        naicNumber: '19682',
        writingCompany: 'Hartford Fire Insurance Company'
      }
    ],
    coverages: {
      generalLiability: {
        insurerLetter: 'B',
        commercialGeneralLiability: true,
        claimsMade: false,
        occur: true,
        addlInsd: true,
        subrWvd: true,
        policyNumber: 'GL-4412093-22',
        effectiveDate: '2026-02-01',
        expirationDate: '2027-02-01',
        limits: {
          eachOccurrence: 1000000,
          damageToRentedPremises: 100000,
          medExp: 5000,
          personalAndAdvInjury: 1000000,
          generalAggregate: 2000000,
          productsCompOpAgg: 2000000
        }
      },
      autoLiability: {
        insurerLetter: 'A',
        anyAuto: true,
        allOwnedAutos: false,
        scheduledAutos: true,
        hiredAutos: true,
        nonOwnedAutos: true,
        addlInsd: true,
        subrWvd: false,
        policyNumber: 'CA-90218-2026',
        effectiveDate: '2026-01-01',
        expirationDate: '2027-01-01',
        limits: {
          combinedSingleLimit: 1000000
        }
      }
    },
    descriptionOfOperations: 'Re: Project #4020 - Chicago Commercial Center. Certificate Holder is included as Additional Insured on General Liability as required by written contract. Waiver of Subrogation applies where permitted by law.',
    certificateHolder: {
      holderId: 'HOLDER-1001',
      name: 'Chicago Commercial Properties LLC',
      attention: 'Risk Management Dept - Suite 500',
      address: {
        street1: '200 South Wacker Drive',
        street2: 'Suite 500',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60606',
        country: 'USA'
      },
      email: 'certificates@chicagocommerical.com',
      phone: '312-555-8800',
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: '2026-01-10T09:00:00Z'
    },
    cancellationNoticeDays: 30,
    authorizedRepresentative: 'Sarah Jenkins, CIC',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z'
  }
];

export const DEFAULT_CHART_OF_ACCOUNTS: GlAccount[] = [
  { accountNumber: '1000', accountName: 'Cash - Operating Account', category: 'Asset', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 125000.00 },
  { accountNumber: '1010', accountName: 'Cash - Premium Fiduciary Trust Account', category: 'Asset', isTrustAccount: true, normalBalance: 'Debit', currentBalance: 45000.00 },
  { accountNumber: '1200', accountName: 'Accounts Receivable - Agency Bill', category: 'Asset', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 18500.00 },
  { accountNumber: '1300', accountName: 'Commission Receivable - Direct Bill', category: 'Asset', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 3200.00 },
  { accountNumber: '2000', accountName: 'Accounts Payable - Carrier Premiums Due', category: 'Liability', isTrustAccount: true, normalBalance: 'Credit', currentBalance: 38250.00 },
  { accountNumber: '3000', accountName: 'Retained Earnings / Agency Equity', category: 'Equity', isTrustAccount: false, normalBalance: 'Credit', currentBalance: 128450.00 },
  { accountNumber: '4000', accountName: 'Agency Commission Revenue', category: 'Revenue', isTrustAccount: false, normalBalance: 'Credit', currentBalance: 25000.00 },
  { accountNumber: '5000', accountName: 'Producer Commission Expense', category: 'Expense', isTrustAccount: false, normalBalance: 'Debit', currentBalance: 0.00 }
];

export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    entryId: 'JE-SEED-001',
    entryDate: '2026-01-01',
    reference: 'OPENING-BALANCE',
    memo: 'Initial Chart of Accounts Trial Balance Opening Entry',
    lines: [
      { accountNumber: '1000', description: 'Opening Operating Cash', debit: 125000.00, credit: 0 },
      { accountNumber: '1010', description: 'Opening Fiduciary Trust Cash', debit: 45000.00, credit: 0 },
      { accountNumber: '1200', description: 'Opening Accounts Receivable', debit: 18500.00, credit: 0 },
      { accountNumber: '1300', description: 'Opening Direct Bill Comm Rec', debit: 3200.00, credit: 0 },
      { accountNumber: '2000', description: 'Opening Carrier Payables', debit: 0, credit: 38250.00 },
      { accountNumber: '3000', description: 'Opening Agency Equity', debit: 0, credit: 128450.00 },
      { accountNumber: '4000', description: 'Opening YTD Commission Revenue', debit: 0, credit: 25000.00 }
    ],
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const INITIAL_DOWNLOAD_BATCHES: DownloadBatch[] = [
  {
    batchId: 'BATCH-DL-SEED-001',
    tenantId: 'tenant-001',
    carrierCode: 'TRV01',
    carrierName: 'Travelers Insurance',
    source: 'IVANS Exchange',
    receivedAt: '2026-01-01T00:00:00.000Z',
    totalTransactions: 3,
    totalPremium: 37100,
    totalCommission: 5079,
    status: 'Reconciled',
    reconciledAt: '2026-01-01T00:00:00.000Z',
    items: [
      {
        itemId: 'DL-ITEM-SEED-1',
        batchId: 'BATCH-DL-SEED-001',
        carrierCode: 'TRV01',
        carrierName: 'Travelers Insurance',
        policyNumber: 'POL-COMM-1001',
        insuredName: 'Acme Logistics LLC',
        insuredFeinOrSsn: '36-9876543',
        lineOfBusiness: 'Commercial Auto',
        transactionType: 'RENE',
        effectiveDate: '2026-01-01',
        grossPremium: 12500,
        commissionRate: 0.15,
        commissionAmount: 1875,
        netCarrierPayable: 10625,
        reconciliationStatus: 'Policy Renewed',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        itemId: 'DL-ITEM-SEED-2',
        batchId: 'BATCH-DL-SEED-001',
        carrierCode: 'TRV01',
        carrierName: 'Travelers Insurance',
        policyNumber: 'POL-COMM-1002',
        insuredName: 'Midwest Industrial Supplies',
        insuredFeinOrSsn: '36-1122334',
        lineOfBusiness: 'General Liability',
        transactionType: 'DBST',
        effectiveDate: '2026-01-01',
        grossPremium: 8400,
        commissionRate: 0.15,
        commissionAmount: 1260,
        netCarrierPayable: 7140,
        reconciliationStatus: 'Policy Renewed',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        itemId: 'DL-ITEM-SEED-3',
        batchId: 'BATCH-DL-SEED-001',
        carrierCode: 'TRV01',
        carrierName: 'Travelers Insurance',
        policyNumber: 'POL-NEW-9044',
        insuredName: 'Apex Transport Group',
        insuredFeinOrSsn: '36-7788990',
        lineOfBusiness: 'Workers Compensation',
        transactionType: 'NEWB',
        effectiveDate: '2026-01-01',
        grossPremium: 16200,
        commissionRate: 0.12,
        commissionAmount: 1944,
        netCarrierPayable: 14256,
        reconciliationStatus: 'New Policy Created',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]
  }
];

