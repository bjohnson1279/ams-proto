import fs from 'fs';

const filePath = 'c:/Users/johns/DEV/ams-proto/src/services/certificate.service.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. imports
code = code.replace("import { AmsService } from './ams.service.js';", "import { AmsService } from './ams.service.js';\nimport { getRepositories, Repositories } from '../db/repository.factory.js';");

// 2. Class properties and constructor
code = code.replace(
  "  private certificateHolders: CertificateHolder[] = [...INITIAL_CERTIFICATE_HOLDERS];\n  private certificates: CertificateOfInsurance[] = [...INITIAL_CERTIFICATES];\n\n  private constructor() {}",
  `  private repos: Repositories;

  private constructor() {
    this.repos = getRepositories();
  }`
);

// 3. methods replacement
code = code.replace(/public getCertificateHolders[\s\S]*?public generateCertificate/, `public async getCertificateHolders(tenantId: string, filter?: { name?: string }): Promise<CertificateHolder[]> {
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
    const nextId = \`HOLDER-\${1000 + Math.floor(Math.random()*10000) + 1}\`;
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
      throw new Error(\`Certificate Holder with ID \${holderId} not found\`);
    }
    if (existing.deactivatedAt) {
      throw new Error(\`Certificate Holder \${holderId} has been deactivated and cannot be updated\`);
    }
    return this.repos.certificateHolders.update(tenantId, holderId, payload);
  }

  public async deactivateCertificateHolder(tenantId: string, holderId: string): Promise<boolean> {
    const existing = await this.repos.certificateHolders.getById(tenantId, holderId);
    if (!existing) {
      throw new Error(\`Certificate Holder with ID \${holderId} not found\`);
    }
    if (existing.deactivatedAt) {
      throw new Error(\`Certificate Holder \${holderId} is already deactivated\`);
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
      throw new Error(\`Certificate with ID \${certificateId} not found\`);
    }
    if (cert.status === 'Revoked') {
      throw new Error(\`Certificate \${certificateId} is already revoked\`);
    }
    if (cert.status === 'Expired') {
      throw new Error(\`Certificate \${certificateId} is expired and cannot be revoked\`);
    }
    await this.repos.certificates.revoke(tenantId, certificateId, reason);
    const updated = await this.getCertificateById(tenantId, certificateId);
    return updated!;
  }

  public async generateCertificate`);

// 4. Update generateCertificate signature and calls
code = code.replace(/public async generateCertificate\([\s\S]*?\): CertificateOfInsurance \{/m, `public async generateCertificate(
    tenantId: string,
    req: CreateCertificateRequest,
    context?: { customer: Customer; selectedPolicies: Policy[]; allCarriersMap: Map<string, Carrier> }
  ): Promise<CertificateOfInsurance> {`);

code = code.replace(
  "const customer = context?.customer || amsService.getCustomerById(req.customerId);",
  "const customer = context?.customer || await amsService.getCustomerById(tenantId, req.customerId);"
);

code = code.replace(
  "const holder = this.getCertificateHolderById(req.holderId);",
  "const holder = await this.getCertificateHolderById(tenantId, req.holderId);"
);

code = code.replace(
  "const allCustomerPolicies = amsService.getPolicies({ customerId: req.customerId });",
  "const allCustomerPolicies = await amsService.getPolicies(tenantId, { customerId: req.customerId });"
);

code = code.replace(
  "const carriers = amsService.getCarriers();",
  "const carriers = await amsService.getCarriers(tenantId);"
);

code = code.replace(
  "const certSeq = this.certificates.length + 101;",
  "const allCerts = await this.repos.certificates.getAll(tenantId);\n    const certSeq = allCerts.length + 101;"
);

code = code.replace(
  "this.certificates.push(newCert);\n    return newCert;",
  "return this.repos.certificates.create(tenantId, newCert);"
);

// 5. Update bulkIssueCertificates
code = code.replace(/public bulkIssueCertificates\([\s\S]*?\): CertificateOfInsurance\[\] \{/, `public async bulkIssueCertificates(tenantId: string, req: BulkIssueCertificateRequest): Promise<CertificateOfInsurance[]> {`);

code = code.replace(
  "const customer = amsService.getCustomerById(req.customerId);",
  "const customer = await amsService.getCustomerById(tenantId, req.customerId);"
);

code = code.replace(
  "const allCustomerPolicies = amsService.getPolicies({ customerId: req.customerId });",
  "const allCustomerPolicies = await amsService.getPolicies(tenantId, { customerId: req.customerId });"
);

code = code.replace(
  "const carriers = amsService.getCarriers();",
  "const carriers = await amsService.getCarriers(tenantId);"
);

code = code.replace(
  /const cert = this\.generateCertificate\(/,
  "const cert = await this.generateCertificate(tenantId, "
);

// 6. Update renderAcord25Html
code = code.replace(
  /public renderAcord25Html\(certificateId: string\): string \{/,
  "public async renderAcord25Html(tenantId: string, certificateId: string): Promise<string> {"
);

code = code.replace(
  "const cert = this.getCertificateById(certificateId);",
  "const cert = await this.getCertificateById(tenantId, certificateId);"
);

fs.writeFileSync(filePath, code);
console.log('Done refactoring certificate.service.ts');
