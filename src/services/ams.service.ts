import { randomInt } from "crypto";
import { Customer, Policy, Carrier, Claim, AcordDecPagePayload, LineOfBusiness, PolicyStatus } from '../types/domain.js';
import { INITIAL_CLAIMS } from '../data/seedData.js';
import { CrosswalkEngine } from '../transformers/crosswalk.engine.js';
import { IngestionPayload, CrosswalkResult } from '../types/legacy.js';
import { AccountingService } from './accounting.service.js';
import { getRepositories, Repositories } from '../db/repository.factory.js';

export class AmsService {
  private static instance: AmsService;

  private claims: Claim[] = [...INITIAL_CLAIMS];
  private crosswalkEngine: CrosswalkEngine;
  private accountingService: AccountingService;
  private repos: Repositories;

  private constructor() {
    this.repos = getRepositories();
    // Initialize crosswalkEngine with empty carriers, we will update it in importLegacyPayload
    this.crosswalkEngine = new CrosswalkEngine([]);
    this.accountingService = AccountingService.getInstance();
  }

  public static getInstance(): AmsService {
    if (!AmsService.instance) {
      AmsService.instance = new AmsService();
    }
    return AmsService.instance;
  }

  // CUSTOMER OPERATIONS
  public async getCustomers(tenantId: string, filter?: { name?: string; policyNumber?: string }): Promise<Customer[]> {
    const filters: any = {};
    if (filter?.name) filters.name = filter.name;
    if (filter?.policyNumber) filters.policyNumber = filter.policyNumber;
    return this.repos.customers.getAll(tenantId, filters);
  }

  public async getCustomerById(tenantId: string, customerId: string): Promise<Customer | undefined> {
    const customer = await this.repos.customers.getById(tenantId, customerId);
    return customer || undefined;
  }

  public async createCustomer(tenantId: string, payload: Partial<Customer>): Promise<Customer> {
    // Rely on repository to assign IDs or use default logic
    const nextId = `CUST-${1000 + randomInt(100, 9999)}`;
    const newCustomer: Partial<Customer> = {
      customerId: payload.customerId || nextId,
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
      legacyCrosswalks: payload.legacyCrosswalks || []
    };

    return this.repos.customers.create(tenantId, newCustomer);
  }

  // POLICY OPERATIONS
  public async getPolicies(tenantId: string, filter?: { customerId?: string; carrierId?: string; status?: string; effectiveDate?: string }): Promise<Policy[]> {
    return this.repos.policies.getAll(tenantId, filter);
  }

  public async getPolicyById(tenantId: string, policyId: string): Promise<Policy | undefined> {
    const policy = await this.repos.policies.getById(tenantId, policyId);
    return policy || undefined;
  }

  public async createPolicy(tenantId: string, payload: Partial<Policy>): Promise<Policy> {
    const nextNum = randomInt(100000, 1000000);
    const newPolicy: Partial<Policy> = {
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
      ]
    };

    const createdPolicy = await this.repos.policies.create(tenantId, newPolicy);

    if (createdPolicy.billingType === 'Agency Bill') {
      try {
        await this.accountingService.generateInvoiceForPolicy(tenantId, createdPolicy);
        createdPolicy.billingStatus = 'Invoiced';
      } catch (err) {
        console.error('Failed to auto-generate invoice for policy:', err);
      }
    }

    return createdPolicy;
  }

  // CARRIER OPERATIONS
  public async getCarriers(tenantId: string): Promise<Carrier[]> {
    return this.repos.carriers.getAll(tenantId);
  }

  // ACORD DEC-PAGE GENERATOR
  public async generateDecPage(tenantId: string, policyIdOrNumber: string): Promise<AcordDecPagePayload> {
    const policy = await this.getPolicyById(tenantId, policyIdOrNumber);
    if (!policy) {
      throw new Error(`Policy '${policyIdOrNumber}' not found in AMS registry.`);
    }

    const customer = await this.getCustomerById(tenantId, policy.customerId);
    const carriers = await this.getCarriers(tenantId);
    const carrier = carriers.find(c => c.carrierId === policy.carrierId) || carriers[0];

    const insuredName = customer?.entityType === 'Commercial'
      ? (customer.businessName || 'Insured Commercial Entity')
      : `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Insured Individual';

    const insuredAddressStr = customer && customer.address
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
        email: customer?.contactInfo?.email || 'insured@domain.com',
        phone: customer?.contactInfo?.phone || '(312) 555-0100'
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
  public async importLegacyPayload(tenantId: string, ingestionPayload: IngestionPayload): Promise<CrosswalkResult> {
    const carriers = await this.getCarriers(tenantId);
    this.crosswalkEngine.updateCarrierMap(carriers);
    
    const customers = await this.getCustomers(tenantId);
    this.crosswalkEngine.updateExistingCustomers(customers);
    
    const result = this.crosswalkEngine.processIngestion(ingestionPayload);

    if (!ingestionPayload.dryRun) {
      for (const newCust of result.customers) {
        // Just create them since our memory/DB repos will handle insert/update
        await this.repos.customers.create(tenantId, newCust);
      }

      for (const newPol of result.policies) {
        await this.repos.policies.create(tenantId, newPol);
      }
    }

    return result;
  }

  public async dryRunImport(tenantId: string, ingestionPayload: IngestionPayload): Promise<CrosswalkResult> {
    return this.importLegacyPayload(tenantId, { ...ingestionPayload, dryRun: true });
  }

  public async getClaims(tenantId: string): Promise<Claim[]> {
    return this.claims;
  }

  public async getCrosswalkMatrix(tenantId: string) {
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
