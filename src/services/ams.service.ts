import { Customer, Policy, Carrier, Claim, AcordDecPagePayload, LineOfBusiness, PolicyStatus } from '../types/domain.js';
import { INITIAL_CARRIERS, INITIAL_CUSTOMERS, INITIAL_POLICIES, INITIAL_CLAIMS } from '../data/seedData.js';
import { CrosswalkEngine } from '../transformers/crosswalk.engine.js';
import { IngestionPayload, CrosswalkResult } from '../types/legacy.js';
import { AccountingService } from './accounting.service.js';

export class AmsService {
  private static instance: AmsService;

  private customers: Customer[] = [...INITIAL_CUSTOMERS];
  private policies: Policy[] = [...INITIAL_POLICIES];
  private carriers: Carrier[] = [...INITIAL_CARRIERS];
  private claims: Claim[] = [...INITIAL_CLAIMS];
  private crosswalkEngine: CrosswalkEngine;
  private accountingService: AccountingService;

  private constructor() {
    this.crosswalkEngine = new CrosswalkEngine(this.carriers);
    this.accountingService = AccountingService.getInstance();
    
    // Auto-generate invoices for initial seed agency bill policies
    for (const pol of this.policies) {
      if (pol.billingType === 'Agency Bill') {
        try {
          this.accountingService.generateInvoiceForPolicy(pol);
          pol.billingStatus = 'Invoiced';
        } catch {
          // Ignore duplicates during seed init
        }
      }
    }
  }


  public static getInstance(): AmsService {
    if (!AmsService.instance) {
      AmsService.instance = new AmsService();
    }
    return AmsService.instance;
  }

  // CUSTOMER OPERATIONS
  public getCustomers(filter?: { name?: string; policyNumber?: string }): Customer[] {
    let result = [...this.customers];

    if (filter?.name) {
      const q = filter.name.toLowerCase();
      result = result.filter(c => {
        const fullIndName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        const busName = (c.businessName || '').toLowerCase();
        const dba = (c.dba || '').toLowerCase();
        return fullIndName.includes(q) || busName.includes(q) || dba.includes(q);
      });
    }

    if (filter?.policyNumber) {
      const pNum = filter.policyNumber.toLowerCase();
      const matchingPolicies = this.policies.filter(p =>
        p.policyNumber.toLowerCase().includes(pNum) || p.policyId.toLowerCase().includes(pNum)
      );
      const customerIdsWithPolicy = new Set(matchingPolicies.map(p => p.customerId));
      result = result.filter(c => customerIdsWithPolicy.has(c.customerId));
    }

    return result;
  }

  public getCustomerById(customerId: string): Customer | undefined {
    return this.customers.find(c => c.customerId === customerId);
  }

  public createCustomer(payload: Partial<Customer>): Customer {
    const nextId = `CUST-${1000 + this.customers.length + 1}`;
    const newCustomer: Customer = {
      customerId: nextId,
      entityType: payload.entityType || (payload.businessName ? 'Commercial' : 'Individual'),
      firstName: payload.firstName,
      lastName: payload.lastName,
      businessName: payload.businessName,
      dba: payload.dba,
      feinOrSsn: payload.feinOrSsn || '00-0000000',
      address: payload.address || {
        street1: '100 Main St',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA'
      },
      contactInfo: payload.contactInfo || {
        email: 'info@insured.com',
        phone: '312-555-0100'
      },
      status: payload.status || 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      legacyCrosswalks: payload.legacyCrosswalks || []
    };

    this.customers.push(newCustomer);
    return newCustomer;
  }

  // POLICY OPERATIONS
  public getPolicies(filter?: { customerId?: string; carrierId?: string; status?: string; effectiveDate?: string }): Policy[] {
    let result = [...this.policies];

    if (filter?.customerId) {
      result = result.filter(p => p.customerId === filter.customerId);
    }

    if (filter?.carrierId) {
      result = result.filter(p => p.carrierId === filter.carrierId);
    }

    if (filter?.status) {
      const st = filter.status.toLowerCase();
      result = result.filter(p => p.status.toLowerCase() === st);
    }

    if (filter?.effectiveDate) {
      const targetDate = filter.effectiveDate;
      result = result.filter(p => p.effectiveDate >= targetDate);
    }

    return result;
  }

  public getPolicyById(policyId: string): Policy | undefined {
    return this.policies.find(p => p.policyId === policyId || p.policyNumber === policyId);
  }

  public createPolicy(payload: Partial<Policy>): Policy {
    const nextNum = Math.floor(100000 + Math.random() * 900000);
    const newPolicy: Policy = {
      policyId: payload.policyId || `POL-${Date.now()}`,
      policyNumber: payload.policyNumber || `POL-NUM-${nextNum}`,
      customerId: payload.customerId || 'CUST-1001',
      carrierId: payload.carrierId || 'CARRIER-001',
      lineOfBusiness: (payload.lineOfBusiness as LineOfBusiness) || 'Commercial Auto',
      effectiveDate: payload.effectiveDate || new Date().toISOString().split('T')[0],
      expirationDate: payload.expirationDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      status: (payload.status as PolicyStatus) || 'Active',
      premiumAmount: Number(payload.premiumAmount) || 5000,
      billingType: payload.billingType || 'Agency Bill',
      coverages: payload.coverages || [
        {
          code: 'GEN_COV',
          name: 'General Coverage Schedule',
          limitAmount: 1000000,
          deductibleAmount: 1000,
          premiumAmount: Number(payload.premiumAmount) || 5000
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.policies.push(newPolicy);

    if (newPolicy.billingType === 'Agency Bill') {
      try {
        this.accountingService.generateInvoiceForPolicy(newPolicy);
        newPolicy.billingStatus = 'Invoiced';
      } catch (err) {
        console.error('Failed to auto-generate invoice for policy:', err);
      }
    }

    return newPolicy;
  }

  // CARRIER OPERATIONS
  public getCarriers(): Carrier[] {
    return this.carriers;
  }

  // ACORD DEC-PAGE GENERATOR
  public generateDecPage(policyIdOrNumber: string): AcordDecPagePayload {
    const policy = this.getPolicyById(policyIdOrNumber);
    if (!policy) {
      throw new Error(`Policy '${policyIdOrNumber}' not found in AMS registry.`);
    }

    const customer = this.getCustomerById(policy.customerId);
    const carrier = this.carriers.find(c => c.carrierId === policy.carrierId) || this.carriers[0];

    const insuredName = customer?.entityType === 'Commercial'
      ? (customer.businessName || 'Insured Commercial Entity')
      : `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Insured Individual';

    const insuredAddressStr = customer
      ? `${customer.address.street1}${customer.address.street2 ? ', ' + customer.address.street2 : ''}, ${customer.address.city}, ${customer.address.state} ${customer.address.postalCode}`
      : 'Address Unspecified';

    const coverageSummary = policy.coverages.map(c => ({
      coverageCode: c.code,
      description: c.name,
      limit: `$${c.limitAmount.toLocaleString()}`,
      deductible: c.deductibleAmount > 0 ? `$${c.deductibleAmount.toLocaleString()}` : 'N/A',
      premium: `$${c.premiumAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));

    const effD = new Date(policy.effectiveDate);
    const expD = new Date(policy.expirationDate);
    const termMonths = Math.round((expD.getTime() - effD.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));

    return {
      documentTitle: 'ACORD 125/126 COMMERCIAL INSURANCE POLICY DECLARATION',
      acordStandard: 'ACORD COMPLIANT',
      generatedTimestamp: new Date().toISOString(),
      agencyInfo: {
        agencyName: 'Apex Pinnacle Insurance Services, Inc.',
        agencyCode: 'AGY-CHI-90210',
        producerName: 'Sarah Jenkins, CIC',
        licenseNumber: 'IL-PROD-998102',
        address: '100 South Wacker Drive, Suite 1800, Chicago, IL 60606',
        phone: '(312) 555-9000'
      },
      insuredHeader: {
        customerId: policy.customerId,
        name: insuredName,
        entityType: customer?.entityType || 'Commercial',
        taxId: customer?.feinOrSsn || '12-3456789',
        address: insuredAddressStr,
        email: customer?.contactInfo.email || 'insured@domain.com',
        phone: customer?.contactInfo.phone || '(312) 555-0100'
      },
      carrierInfo: {
        carrierId: carrier.carrierId,
        carrierName: carrier.carrierName,
        naicNumber: carrier.naicNumber,
        writingCompany: carrier.writingCompany
      },
      policySummary: {
        policyId: policy.policyId,
        policyNumber: policy.policyNumber,
        lineOfBusiness: policy.lineOfBusiness,
        effectiveDate: policy.effectiveDate,
        expirationDate: policy.expirationDate,
        termLengthMonths: termMonths || 12,
        status: policy.status,
        billingType: policy.billingType
      },
      coverageDetails: coverageSummary,
      financials: {
        totalPremium: `$${policy.premiumAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        surplusLinesTax: policy.billingType === 'Agency Bill' ? '$0.00' : undefined,
        totalAmountDue: `$${policy.premiumAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      },
      formsAndEndorsements: [
        { formCode: 'IL 00 17 11 98', editionDate: '11-98', title: 'Common Policy Conditions' },
        { formCode: 'CG 00 01 04 13', editionDate: '04-13', title: 'Commercial General Liability Coverage Form' },
        { formCode: 'CA 00 01 10 13', editionDate: '10-13', title: 'Business Auto Coverage Form' }
      ]
    };
  }

  // LEGACY INGESTION & CROSSWALK
  public importLegacyPayload(ingestionPayload: IngestionPayload): CrosswalkResult {
    this.crosswalkEngine.updateCarrierMap(this.carriers);
    this.crosswalkEngine.updateExistingCustomers(this.customers);
    const result = this.crosswalkEngine.processIngestion(ingestionPayload);

    if (!ingestionPayload.dryRun) {
      for (const newCust of result.customers) {
        const existingIdx = this.customers.findIndex(c => c.customerId === newCust.customerId);
        if (existingIdx >= 0) {
          this.customers[existingIdx] = { ...this.customers[existingIdx], ...newCust };
        } else {
          this.customers.push(newCust);
        }
      }

      for (const newPol of result.policies) {
        const existingIdx = this.policies.findIndex(p => p.policyId === newPol.policyId);
        if (existingIdx >= 0) {
          this.policies[existingIdx] = newPol;
        } else {
          this.policies.push(newPol);
        }
      }
    }

    return result;
  }

  public dryRunImport(ingestionPayload: IngestionPayload): CrosswalkResult {
    return this.importLegacyPayload({ ...ingestionPayload, dryRun: true });
  }

  public getClaims(): Claim[] {
    return this.claims;
  }

  public getCrosswalkMatrix() {
    return [
      {
        format: 'FORMAT_A',
        systemType: 'Enterprise SQL Relational Schema',
        sourceField: 'Client_PK / ClientCode',
        canonicalField: 'customerId',
        transformRule: "Prefix with 'CUST-FMT-A-'",
        example: '89402 -> CUST-FMT-A-89402',
      },
      {
        format: 'FORMAT_A',
        systemType: 'Enterprise SQL Relational Schema',
        sourceField: 'Line_Of_Business_Code',
        canonicalField: 'lineOfBusiness',
        transformRule: "Enum Map: AUTOC -> 'Commercial Auto', GL -> 'General Liability', WORK -> 'Workers Comp'",
        example: "AUTOC -> 'Commercial Auto'",
      },
      {
        format: 'FORMAT_A',
        systemType: 'Enterprise SQL Relational Schema',
        sourceField: 'Effective_Dt',
        canonicalField: 'effectiveDate',
        transformRule: 'Normalize MM/DD/YYYY to ISO YYYY-MM-DD',
        example: '03/15/2026 -> 2026-03-15',
      },
      {
        format: 'FORMAT_B',
        systemType: 'Legacy Flat-File DB Schema',
        sourceField: 'CUST_ID / CLIENT_NO',
        canonicalField: 'customerId',
        transformRule: "Prefix with 'CUST-FMT-B-'",
        example: 'FMT-B-9921 -> CUST-FMT-B-FMT-B-9921',
      },
      {
        format: 'FORMAT_B',
        systemType: 'Legacy Flat-File DB Schema',
        sourceField: 'EFF_DT',
        canonicalField: 'effectiveDate',
        transformRule: 'Parse YYYYMMDD compact string to YYYY-MM-DD',
        example: '20260401 -> 2026-04-01',
      },
      {
        format: 'FORMAT_C',
        systemType: 'Desktop CMS XML Schema',
        sourceField: 'ClientNum / FileID',
        canonicalField: 'customerId',
        transformRule: "Prefix with 'CUST-FMT-C-'",
        example: 'FMT-C-44820 -> CUST-FMT-C-FMT-C-44820',
      },
      {
        format: 'FORMAT_D',
        systemType: 'Cloud JSON REST Schema',
        sourceField: 'account_uuid',
        canonicalField: 'customerId',
        transformRule: "Prefix with 'CUST-FMT-D-'",
        example: 'acc-cloud-99182 -> CUST-FMT-D-acc-cloud-99182',
      },
      {
        format: 'FORMAT_D',
        systemType: 'Cloud JSON REST Schema',
        sourceField: 'annual_premium_cents',
        canonicalField: 'premiumAmount',
        transformRule: 'Convert cents float to dollars (cents / 100)',
        example: '4500000 -> 45000.00',
      },
    ];
  }
}
