import {
  CertificateHolder,
  CertificateOfInsurance,
  Acord25InsurerSlot,
  Acord25GeneralLiability,
  Acord25AutoLiability,
  Acord25WorkersComp,
  Acord25UmbrellaLiability,
  Acord25OtherCoverage,
  CreateCertificateRequest,
  BulkIssueCertificateRequest,
  Customer,
  Policy,
  Carrier
} from '../types/domain.js';
import { AmsService } from './ams.service.js';
import { getRepositories, Repositories } from '../db/repository.factory.js';

export class CertificateService {
  private static instance: CertificateService;

  private repos: Repositories;

  private constructor() {
    this.repos = getRepositories();
  }

  public static getInstance(): CertificateService {
    if (!CertificateService.instance) {
      CertificateService.instance = new CertificateService();
    }
    return CertificateService.instance;
  }

  // CERTIFICATE HOLDER MANAGEMENT
  public async getCertificateHolders(tenantId: string, filter?: { name?: string }): Promise<CertificateHolder[]> {
    return this.repos.certificateHolders.getAll(tenantId, filter);
  }

  public async getCertificateHolderById(tenantId: string, holderId: string): Promise<CertificateHolder | undefined> {
    const holder = await this.repos.certificateHolders.getById(tenantId, holderId);
    return holder || undefined;
  }

  public async createCertificateHolder(tenantId: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder> {
    if (!payload.name) {
      throw new Error('Certificate Holder name is required');
    }
    const nextId = `HOLDER-${1000 + Math.floor(Math.random()*10000) + 1}`;
    const newHolder: Partial<CertificateHolder> = {
      holderId: nextId,
      name: payload.name,
      attention: payload.attention,
      address: payload.address || {
        street1: '100 Main St',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA'
      },
      email: payload.email || 'holder@example.com',
      phone: payload.phone,
      defaultSpecialWording: payload.defaultSpecialWording,
      deliveryPreference: payload.deliveryPreference || 'Email'
    };
    return this.repos.certificateHolders.create(tenantId, newHolder);
  }

  public async updateCertificateHolder(tenantId: string, holderId: string, payload: Partial<CertificateHolder>): Promise<CertificateHolder> {
    const existing = await this.repos.certificateHolders.getById(tenantId, holderId);
    if (!existing) {
      throw new Error(`Certificate Holder with ID ${holderId} not found`);
    }
    if (existing.deactivatedAt) {
      throw new Error(`Certificate Holder ${holderId} has been deactivated and cannot be updated`);
    }
    return this.repos.certificateHolders.update(tenantId, holderId, payload);
  }

  public async deactivateCertificateHolder(tenantId: string, holderId: string): Promise<boolean> {
    const existing = await this.repos.certificateHolders.getById(tenantId, holderId);
    if (!existing) {
      throw new Error(`Certificate Holder with ID ${holderId} not found`);
    }
    if (existing.deactivatedAt) {
      throw new Error(`Certificate Holder ${holderId} is already deactivated`);
    }
    await this.repos.certificateHolders.deactivate(tenantId, holderId);
    return true;
  }

  // CERTIFICATE OPERATIONS
  public async getCertificates(tenantId: string, filter?: { customerId?: string; holderId?: string; status?: string }): Promise<CertificateOfInsurance[]> {
    return this.repos.certificates.getAll(tenantId, filter);
  }

  public async getCertificateById(tenantId: string, certificateId: string): Promise<CertificateOfInsurance | undefined> {
    const cert = await this.repos.certificates.getById(tenantId, certificateId);
    return cert || undefined;
  }

  public async revokeCertificate(tenantId: string, certificateId: string, reason?: string): Promise<CertificateOfInsurance> {
    const cert = await this.getCertificateById(tenantId, certificateId);
    if (!cert) {
      throw new Error(`Certificate with ID ${certificateId} not found`);
    }
    if (cert.status === 'Revoked') {
      throw new Error(`Certificate ${certificateId} is already revoked`);
    }
    if (cert.status === 'Expired') {
      throw new Error(`Certificate ${certificateId} is expired and cannot be revoked`);
    }
    await this.repos.certificates.revoke(tenantId, certificateId, reason);
    const updated = await this.getCertificateById(tenantId, certificateId);
    return updated!;
  }

  public async generateCertificate(
    tenantId: string,
    req: CreateCertificateRequest,
    context?: { customer: Customer; selectedPolicies: Policy[]; allCarriersMap: Map<string, Carrier> }
  ): Promise<CertificateOfInsurance> {
    const amsService = AmsService.getInstance();

    const customer = context?.customer || await amsService.getCustomerById(tenantId, req.customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${req.customerId} not found`);
    }

    const holder = await this.getCertificateHolderById(tenantId, req.holderId);
    if (!holder) {
      throw new Error(`Certificate Holder with ID ${req.holderId} not found`);
    }

    let selectedPolicies = context?.selectedPolicies;
    if (!selectedPolicies) {
      // Get policies for customer
      const allCustomerPolicies = await amsService.getPolicies(tenantId, { customerId: req.customerId });
      if (allCustomerPolicies.length === 0) {
        throw new Error(`No policies found for customer ${req.customerId}`);
      }

      selectedPolicies = allCustomerPolicies;
      if (req.policyIds && req.policyIds.length > 0 && !req.policyIds.includes('ALL')) {
        selectedPolicies = allCustomerPolicies.filter(p => req.policyIds.includes(p.policyId) || req.policyIds.includes(p.policyNumber));
      }

      if (selectedPolicies.length === 0) {
        throw new Error('No matching policies selected for Certificate of Insurance');
      }
    }

    // Gather carriers and assign Insurer Letters (A, B, C, D, E)
    let allCarriersMap = context?.allCarriersMap;
    if (!allCarriersMap) {
      const carriers = await amsService.getCarriers(tenantId);
      // ⚡ Bolt: Pre-compute a Map of carriers by ID to avoid O(N*M) lookups inside the policies loop
      allCarriersMap = new Map(carriers.map(c => [c.carrierId, c]));
    }

    const insurerLetters: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    const carrierMap = new Map<string, Acord25InsurerSlot>();

    selectedPolicies.forEach(pol => {
      if (!carrierMap.has(pol.carrierId)) {
        // ⚡ Bolt: Replace O(N) array search with O(1) Map lookup
        const foundCarrier = allCarriersMap!.get(pol.carrierId);
        const letter = insurerLetters[carrierMap.size] || 'E';
        carrierMap.set(pol.carrierId, {
          letter,
          carrierId: pol.carrierId,
          carrierName: foundCarrier?.carrierName || 'Primary Insurance Co',
          naicNumber: foundCarrier?.naicNumber || '00000',
          writingCompany: foundCarrier?.writingCompany || foundCarrier?.carrierName || 'Primary Insurance Co'
        });
      }
    });

    const insurers: Acord25InsurerSlot[] = Array.from(carrierMap.values());

    // Map coverages by Line of Business
    let generalLiability: Acord25GeneralLiability | undefined;
    let autoLiability: Acord25AutoLiability | undefined;
    let umbrellaLiability: Acord25UmbrellaLiability | undefined;
    let workersComp: Acord25WorkersComp | undefined;
    const otherCoverages: Acord25OtherCoverage[] = [];

    selectedPolicies.forEach(pol => {
      const insurerSlot = carrierMap.get(pol.carrierId);
      const letter = insurerSlot ? insurerSlot.letter : 'A';

      if (pol.lineOfBusiness === 'General Liability') {
        // ⚡ Bolt: Replaced multiple .find() with a single pass to prevent redundant O(N) array scans and inline string allocations
        let eachOccLimit;
        let genAggLimit;
        for (const c of pol.coverages) {
          const lowerName = c.name.toLowerCase();
          if (eachOccLimit === undefined && (c.code.includes('OCCUR') || lowerName.includes('occurrence'))) eachOccLimit = c.limitAmount;
          if (genAggLimit === undefined && (c.code.includes('AGG') || lowerName.includes('aggregate'))) genAggLimit = c.limitAmount;
          if (eachOccLimit !== undefined && genAggLimit !== undefined) break;
        }

        const eachOcc = eachOccLimit || 1000000;
        const genAgg = genAggLimit || 2000000;

        generalLiability = {
          insurerLetter: letter,
          commercialGeneralLiability: true,
          claimsMade: false,
          occur: true,
          addlInsd: true,
          subrWvd: true,
          policyNumber: pol.policyNumber,
          effectiveDate: pol.effectiveDate,
          expirationDate: pol.expirationDate,
          limits: {
            eachOccurrence: eachOcc,
            damageToRentedPremises: 100000,
            medExp: 5000,
            personalAndAdvInjury: eachOcc,
            generalAggregate: genAgg,
            productsCompOpAgg: genAgg
          }
        };
      } else if (pol.lineOfBusiness === 'Commercial Auto') {
        // ⚡ Bolt: Replaced .find() with loop to prevent inline string allocations
        let cslLimit;
        for (const c of pol.coverages) {
          const lowerName = c.name.toLowerCase();
          if (c.code.includes('CSL') || lowerName.includes('liability') || lowerName.includes('combined')) {
            cslLimit = c.limitAmount;
            break;
          }
        }

        const csl = cslLimit || 1000000;

        autoLiability = {
          insurerLetter: letter,
          anyAuto: true,
          allOwnedAutos: false,
          scheduledAutos: true,
          hiredAutos: true,
          nonOwnedAutos: true,
          addlInsd: true,
          subrWvd: false,
          policyNumber: pol.policyNumber,
          effectiveDate: pol.effectiveDate,
          expirationDate: pol.expirationDate,
          limits: {
            combinedSingleLimit: csl
          }
        };
      } else if (pol.lineOfBusiness === 'Workers Comp') {
        // ⚡ Bolt: Replaced .find() with loop to prevent inline string allocations
        let statLimitVal;
        for (const c of pol.coverages) {
          const lowerName = c.name.toLowerCase();
          if (c.code.includes('WC') || lowerName.includes('workers')) {
            statLimitVal = c.limitAmount;
            break;
          }
        }

        const statLimit = statLimitVal || 1000000;

        workersComp = {
          insurerLetter: letter,
          statutoryLimits: true,
          otherLimits: false,
          excludedProprietorPartnerOfficer: false,
          addlInsd: false,
          subrWvd: true,
          policyNumber: pol.policyNumber,
          effectiveDate: pol.effectiveDate,
          expirationDate: pol.expirationDate,
          limits: {
            elEachAccident: statLimit,
            elDiseasePolicyLimit: statLimit,
            elDiseaseEAEmployee: statLimit
          }
        };
      } else if (pol.lineOfBusiness === 'BOP' || pol.lineOfBusiness.toLowerCase().includes('umbrella')) {
        // Map Umbrella / Excess Liability policies
        let occLimit;
        let aggLimit;
        for (const c of pol.coverages) {
          const lowerName = c.name.toLowerCase();
          if (occLimit === undefined && (c.code.includes('OCCUR') || lowerName.includes('occurrence'))) occLimit = c.limitAmount;
          if (aggLimit === undefined && (c.code.includes('AGG') || lowerName.includes('aggregate'))) aggLimit = c.limitAmount;
          if (occLimit !== undefined && aggLimit !== undefined) break;
        }

        umbrellaLiability = {
          insurerLetter: letter,
          umbrellaLiab: true,
          excessLiab: false,
          occur: true,
          claimsMade: false,
          addlInsd: true,
          subrWvd: true,
          policyNumber: pol.policyNumber,
          effectiveDate: pol.effectiveDate,
          expirationDate: pol.expirationDate,
          limits: {
            eachOccurrence: occLimit || 5000000,
            aggregate: aggLimit || 5000000
          }
        };
      } else {
        // Catch-all: map Commercial Property, Cyber, Professional Liability, Inland Marine, etc. to otherCoverages
        const totalLimit = pol.coverages.reduce((sum, c) => sum + c.limitAmount, 0);
        const otherCov: Acord25OtherCoverage = {
          insurerLetter: letter,
          coverageDescription: pol.lineOfBusiness,
          addlInsd: true,
          subrWvd: false,
          policyNumber: pol.policyNumber,
          effectiveDate: pol.effectiveDate,
          expirationDate: pol.expirationDate,
          limitsDescription: `Per Occurrence: $${(totalLimit || 1000000).toLocaleString('en-US')}`
        };
        otherCoverages.push(otherCov);
      }
    });

    // Build description of operations wording
    const descParts: string[] = [];
    if (holder.defaultSpecialWording) {
      descParts.push(holder.defaultSpecialWording);
    }
    if (req.descriptionOfOperations) {
      descParts.push(req.descriptionOfOperations);
    }
    if (descParts.length === 0) {
      descParts.push('Certificate Holder is listed as Additional Insured as required by written contract subject to policy terms and conditions.');
    }

    const allCerts = await this.repos.certificates.getAll(tenantId);
    const certSeq = allCerts.length + 101;
    const todayStr = new Date().toISOString().split('T')[0];
    const newCert: Partial<CertificateOfInsurance> = {
      certificateId: `CERT-2026-${certSeq}`,
      certificateNumber: `COI-2026-${9900 + certSeq}`,
      issueDate: todayStr,
      status: 'Issued',
      producer: {
        agencyName: 'Apex Pinnacle Insurance Services, Inc.',
        producerName: 'Sarah Jenkins, CIC',
        address: '100 South Wacker Drive, Suite 1800, Chicago, IL 60606',
        phone: '(312) 555-9000',
        email: 'certificates@apexpinnacle.com'
      },
      insured: {
        customerId: customer.customerId,
        name: customer.businessName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        address: `${customer.address.street1}, ${customer.address.city}, ${customer.address.state} ${customer.address.postalCode}`,
        email: customer.contactInfo.email,
        phone: customer.contactInfo.phone
      },
      insurers,
      coverages: {
        generalLiability,
        autoLiability,
        umbrellaLiability,
        workersComp,
        otherCoverages
      },
      descriptionOfOperations: descParts.join(' '),
      certificateHolder: holder,
      cancellationNoticeDays: req.cancellationNoticeDays || 30,
      authorizedRepresentative: 'Sarah Jenkins, CIC'
    };

    return this.repos.certificates.create(tenantId, newCert);
  }

  public async bulkIssueCertificates(tenantId: string, req: BulkIssueCertificateRequest): Promise<CertificateOfInsurance[]> {
    if (!req.holderIds || req.holderIds.length === 0) {
      throw new Error('At least one holderId must be provided for bulk issuance');
    }

    // ⚡ Bolt: Pre-fetch customer, policies, and carrier map once to avoid O(H * (P + C)) redundant database scans
    const amsService = AmsService.getInstance();
    const customer = await amsService.getCustomerById(tenantId, req.customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${req.customerId} not found`);
    }

    const allCustomerPolicies = await amsService.getPolicies(tenantId, { customerId: req.customerId });
    if (allCustomerPolicies.length === 0) {
      throw new Error(`No policies found for customer ${req.customerId}`);
    }

    let selectedPolicies = allCustomerPolicies;
    if (req.policyIds && req.policyIds.length > 0 && !req.policyIds.includes('ALL')) {
      selectedPolicies = allCustomerPolicies.filter(p => req.policyIds.includes(p.policyId) || req.policyIds.includes(p.policyNumber));
    }

    if (selectedPolicies.length === 0) {
      throw new Error('No matching policies selected for Certificate of Insurance');
    }

    const carriers = await amsService.getCarriers(tenantId);
    const allCarriersMap = new Map(carriers.map(c => [c.carrierId, c]));

    const context = { customer, selectedPolicies, allCarriersMap };

    const issued: CertificateOfInsurance[] = [];
    for (const holderId of req.holderIds) {
      const cert = await this.generateCertificate(tenantId, {
        customerId: req.customerId,
        holderId,
        policyIds: req.policyIds,
        descriptionOfOperations: req.descriptionOfOperations,
        cancellationNoticeDays: req.cancellationNoticeDays
      }, context);
      issued.push(cert);
    }
    return issued;
  }

  // RENDER HIGH-FIDELITY ACORD 25 HTML
  public async renderAcord25Html(tenantId: string, certificateId: string): Promise<string> {
    const cert = await this.getCertificateById(tenantId, certificateId);
    if (!cert) {
      throw new Error(`Certificate with ID ${certificateId} not found`);
    }

    const escapeHtml = (unsafe?: string): string => {
      if (!unsafe) return '';
      return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const fmtCurr = (num?: number) => {
      if (num === undefined || num === null) return 'N/A';
      return `$${num.toLocaleString('en-US')}`;
    };

    const insurersByLetter: Record<string, string> = { A: '', B: '', C: '', D: '', E: '' };
    cert.insurers.forEach(ins => {
      insurersByLetter[ins.letter] = `${ins.writingCompany} (NAIC: ${ins.naicNumber})`;
    });

    const gl = cert.coverages.generalLiability;
    const auto = cert.coverages.autoLiability;
    const wc = cert.coverages.workersComp;
    const umb = cert.coverages.umbrellaLiability;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ACORD 25 - Certificate of Liability Insurance (${cert.certificateNumber})</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #111;
      background-color: #f8fafc;
      font-size: 11px;
    }
    .acord-container {
      max-width: 900px;
      margin: 0 auto;
      background: #fff;
      border: 2px solid #000;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .header-title {
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-sub {
      font-size: 9px;
      color: #444;
    }
    .disclaimer-box {
      border: 1px solid #000;
      background: #f1f5f9;
      padding: 6px;
      font-size: 8px;
      margin-bottom: 8px;
      text-align: justify;
      line-height: 1.2;
    }
    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .box {
      border: 1px solid #000;
      padding: 6px;
      min-height: 90px;
    }
    .box-title {
      font-weight: bold;
      font-size: 9px;
      text-transform: uppercase;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
      margin-bottom: 4px;
      background: #e2e8f0;
      padding-left: 4px;
    }
    .insurer-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      margin-bottom: 8px;
    }
    .insurer-table th, .insurer-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      font-size: 9px;
    }
    .insurer-table th {
      background: #0f172a;
      color: #fff;
      text-align: left;
    }
    .coverages-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
      margin-bottom: 8px;
    }
    .coverages-table th {
      background: #0f172a;
      color: #fff;
      font-size: 9px;
      padding: 4px;
      border: 1px solid #000;
    }
    .coverages-table td {
      border: 1px solid #000;
      padding: 4px;
      vertical-align: top;
      font-size: 9px;
    }
    .coverage-type-header {
      font-weight: bold;
      background: #f1f5f9;
      padding: 2px 4px;
      border-bottom: 1px solid #cbd5e1;
    }
    .limits-list {
      list-style: none;
      padding-left: 0;
      margin: 0;
    }
    .limits-list li {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding: 2px 0;
    }
    .ops-box {
      border: 1px solid #000;
      padding: 8px;
      margin-bottom: 8px;
      min-height: 70px;
    }
    .holder-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 8px;
    }
    .signature-line {
      margin-top: 30px;
      border-top: 1px solid #000;
      text-align: center;
      font-weight: bold;
      padding-top: 4px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .acord-container { border: none; box-shadow: none; width: 100%; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="acord-container">
    <table class="header-table">
      <tr>
        <td style="width: 70%;">
          <div class="header-title">ACORD 25 (2016/03) — CERTIFICATE OF LIABILITY INSURANCE</div>
          <div class="header-sub">PRODUCER: ${escapeHtml(cert.producer.agencyName)} | LICENSE: IL-PROD-998102</div>
        </td>
        <td style="width: 30%; text-align: right;">
          <strong>DATE (MM/DD/YYYY):</strong> ${escapeHtml(cert.issueDate)}<br>
          <strong>CERTIFICATE #:</strong> ${escapeHtml(cert.certificateNumber)}
        </td>
      </tr>
    </table>

    <div class="disclaimer-box">
      <strong>IMPORTANT:</strong> THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY AND CONFERS NO RIGHTS UPON THE CERTIFICATE HOLDER. THIS CERTIFICATE DOES NOT AMEND, EXTEND OR ALTER THE COVERAGE AFFORDED BY THE POLICIES BELOW. THIS CERTIFICATE OF INSURANCE DOES NOT CONSTITUTE A CONTRACT BETWEEN THE ISSUING INSURER(S), AUTHORIZED REPRESENTATIVE OR PRODUCER, AND THE CERTIFICATE HOLDER.
    </div>

    <div class="section-grid">
      <div class="box">
        <div class="box-title">PRODUCER</div>
        <strong>${escapeHtml(cert.producer.agencyName)}</strong><br>
        ${escapeHtml(cert.producer.address)}<br>
        Producer Contact: ${escapeHtml(cert.producer.producerName)}<br>
        Phone: ${escapeHtml(cert.producer.phone)} | Email: ${escapeHtml(cert.producer.email)}
      </div>
      <div class="box">
        <div class="box-title">INSURED</div>
        <strong>${escapeHtml(cert.insured.name)}</strong><br>
        ${escapeHtml(cert.insured.address)}<br>
        Contact Email: ${escapeHtml(cert.insured.email)}<br>
        Phone: ${escapeHtml(cert.insured.phone)}
      </div>
    </div>

    <table class="insurer-table">
      <thead>
        <tr>
          <th style="width: 15%;">INSURER LETTER</th>
          <th style="width: 85%;">INSURER(S) AFFORDING COVERAGE</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>INSURER A:</strong></td><td>${insurersByLetter.A || 'N/A'}</td></tr>
        <tr><td><strong>INSURER B:</strong></td><td>${insurersByLetter.B || 'N/A'}</td></tr>
        <tr><td><strong>INSURER C:</strong></td><td>${insurersByLetter.C || 'N/A'}</td></tr>
        <tr><td><strong>INSURER D:</strong></td><td>${insurersByLetter.D || 'N/A'}</td></tr>
        <tr><td><strong>INSURER E:</strong></td><td>${insurersByLetter.E || 'N/A'}</td></tr>
      </tbody>
    </table>

    <table class="coverages-table">
      <thead>
        <tr>
          <th style="width: 3%;">LTR</th>
          <th style="width: 35%;">TYPE OF INSURANCE</th>
          <th style="width: 5%;">ADDL INSD</th>
          <th style="width: 5%;">SUBR WVD</th>
          <th style="width: 20%;">POLICY NUMBER</th>
          <th style="width: 12%;">POLICY EFF</th>
          <th style="width: 12%;">POLICY EXP</th>
          <th style="width: 8%;">LIMITS</th>
        </tr>
      </thead>
      <tbody>
        <!-- GENERAL LIABILITY -->
        <tr>
          <td style="text-align:center;"><strong>${gl ? gl.insurerLetter : '-'}</strong></td>
          <td>
            <div class="coverage-type-header">COMMERCIAL GENERAL LIABILITY</div>
            ${gl?.occur ? '☑ OCCURRENCE' : '☐ OCCURRENCE'}&nbsp;&nbsp;${gl?.claimsMade ? '☑ CLAIMS-MADE' : '☐ CLAIMS-MADE'}
          </td>
          <td style="text-align:center;">${gl?.addlInsd ? 'Y' : 'N'}</td>
          <td style="text-align:center;">${gl?.subrWvd ? 'Y' : 'N'}</td>
          <td><strong>${gl?.policyNumber || 'N/A'}</strong></td>
          <td>${gl?.effectiveDate || '-'}</td>
          <td>${gl?.expirationDate || '-'}</td>
          <td>
            <ul class="limits-list">
              <li><span>EACH OCCURRENCE:</span> <strong>${fmtCurr(gl?.limits.eachOccurrence)}</strong></li>
              <li><span>RENTED PREMISES:</span> <span>${fmtCurr(gl?.limits.damageToRentedPremises)}</span></li>
              <li><span>MED EXP (Any one person):</span> <span>${fmtCurr(gl?.limits.medExp)}</span></li>
              <li><span>PERSONAL & ADV INJURY:</span> <span>${fmtCurr(gl?.limits.personalAndAdvInjury)}</span></li>
              <li><span>GENERAL AGGREGATE:</span> <strong>${fmtCurr(gl?.limits.generalAggregate)}</strong></li>
              <li><span>PRODUCTS - COMP/OP AGG:</span> <span>${fmtCurr(gl?.limits.productsCompOpAgg)}</span></li>
            </ul>
          </td>
        </tr>

        <!-- AUTOMOBILE LIABILITY -->
        <tr>
          <td style="text-align:center;"><strong>${auto ? auto.insurerLetter : '-'}</strong></td>
          <td>
            <div class="coverage-type-header">AUTOMOBILE LIABILITY</div>
            ${auto?.anyAuto ? '☑ ANY AUTO' : '☐ ANY AUTO'}&nbsp;&nbsp;
            ${auto?.scheduledAutos ? '☑ SCHEDULED' : '☐ SCHEDULED'}&nbsp;&nbsp;
            ${auto?.hiredAutos ? '☑ HIRED' : '☐ HIRED'}
          </td>
          <td style="text-align:center;">${auto?.addlInsd ? 'Y' : 'N'}</td>
          <td style="text-align:center;">${auto?.subrWvd ? 'Y' : 'N'}</td>
          <td><strong>${auto?.policyNumber || 'N/A'}</strong></td>
          <td>${auto?.effectiveDate || '-'}</td>
          <td>${auto?.expirationDate || '-'}</td>
          <td>
            <ul class="limits-list">
              <li><span>COMBINED SINGLE LIMIT:</span> <strong>${fmtCurr(auto?.limits.combinedSingleLimit)}</strong></li>
              <li><span>BODILY INJURY (Per person):</span> <span>${fmtCurr(auto?.limits.bodilyInjuryPerPerson)}</span></li>
              <li><span>BODILY INJURY (Per accident):</span> <span>${fmtCurr(auto?.limits.bodilyInjuryPerAccident)}</span></li>
              <li><span>PROPERTY DAMAGE:</span> <span>${fmtCurr(auto?.limits.propertyDamage)}</span></li>
            </ul>
          </td>
        </tr>

        <!-- WORKERS COMPENSATION -->
        <tr>
          <td style="text-align:center;"><strong>${wc ? wc.insurerLetter : '-'}</strong></td>
          <td>
            <div class="coverage-type-header">WORKERS COMPENSATION & EMPLOYERS' LIABILITY</div>
            ${wc?.statutoryLimits ? '☑ STATUTORY LIMITS' : '☐ STATUTORY LIMITS'}
          </td>
          <td style="text-align:center;">${wc?.addlInsd ? 'Y' : 'N'}</td>
          <td style="text-align:center;">${wc?.subrWvd ? 'Y' : 'N'}</td>
          <td><strong>${wc?.policyNumber || 'N/A'}</strong></td>
          <td>${wc?.effectiveDate || '-'}</td>
          <td>${wc?.expirationDate || '-'}</td>
          <td>
            <ul class="limits-list">
              <li><span>E.L. EACH ACCIDENT:</span> <strong>${fmtCurr(wc?.limits.elEachAccident)}</strong></li>
              <li><span>E.L. DISEASE - POLICY LIMIT:</span> <span>${fmtCurr(wc?.limits.elDiseasePolicyLimit)}</span></li>
              <li><span>E.L. DISEASE - EA EMPLOYEE:</span> <span>${fmtCurr(wc?.limits.elDiseaseEAEmployee)}</span></li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="ops-box">
      <div class="box-title">DESCRIPTION OF OPERATIONS / LOCATIONS / VEHICLES / SPECIAL PROVISIONS</div>
      ${escapeHtml(cert.descriptionOfOperations)}
    </div>

    <div class="holder-grid">
      <div class="box">
        <div class="box-title">CERTIFICATE HOLDER</div>
        <strong>${escapeHtml(cert.certificateHolder.name)}</strong><br>
        ${cert.certificateHolder.attention ? `Attn: ${escapeHtml(cert.certificateHolder.attention)}<br>` : ''}
        ${escapeHtml(cert.certificateHolder.address.street1)} ${cert.certificateHolder.address.street2 ? escapeHtml(cert.certificateHolder.address.street2) : ''}<br>
        ${escapeHtml(cert.certificateHolder.address.city)}, ${escapeHtml(cert.certificateHolder.address.state)} ${escapeHtml(cert.certificateHolder.address.postalCode)}<br>
        Email: ${escapeHtml(cert.certificateHolder.email)}
      </div>

      <div class="box">
        <div class="box-title">CANCELLATION</div>
        <p style="font-size: 8px; margin-top: 0;">
          SHOULD ANY OF THE ABOVE DESCRIBED POLICIES BE CANCELLED BEFORE THE EXPIRATION DATE THEREOF, NOTICE WILL BE DELIVERED IN ACCORDANCE WITH THE POLICY PROVISIONS. (${cert.cancellationNoticeDays} DAYS NOTICE)
        </p>
        <div class="signature-line">
          ${cert.authorizedRepresentative}<br>
          <span style="font-size: 8px; font-weight: normal; color: #555;">AUTHORIZED REPRESENTATIVE</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
