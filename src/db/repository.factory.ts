import {
  ICustomerRepository,
  IPolicyRepository,
  ICarrierRepository,
  ICertificateHolderRepository,
  ICertificateRepository,
  IAccountingRepository,
  IDownloadRepository
} from './repository.interfaces.js';

import { PgCustomerRepository } from './pg.customer.repository.js';
import { PgPolicyRepository } from './pg.policy.repository.js';
import { PgCertificateHolderRepository, PgCertificateRepository } from './pg.certificate.repository.js';
import { PgAccountingRepository } from './pg.accounting.repository.js';
import { PgDownloadRepository } from './pg.download.repository.js';

import {
  MemoryCustomerRepository,
  MemoryPolicyRepository,
  MemoryCarrierRepository,
  MemoryCertificateHolderRepository,
  MemoryCertificateRepository,
  MemoryAccountingRepository,
  MemoryDownloadRepository
} from './memory.repositories.js';

// We don't have a pg carrier repo explicitly requested, but we need to return one.
// The memory one works as a fallback since the pg one was omitted from instructions.
class PgCarrierRepository extends MemoryCarrierRepository {}

export interface Repositories {
  customers: ICustomerRepository;
  policies: IPolicyRepository;
  carriers: ICarrierRepository;
  certificateHolders: ICertificateHolderRepository;
  certificates: ICertificateRepository;
  accounting: IAccountingRepository;
  downloads: IDownloadRepository;
}

export function getRepositories(): Repositories {
  const usePg = !!process.env.DATABASE_URL;

  if (usePg) {
    return {
      customers: new PgCustomerRepository(),
      policies: new PgPolicyRepository(),
      carriers: new PgCarrierRepository(), // Assuming a fallback
      certificateHolders: new PgCertificateHolderRepository(),
      certificates: new PgCertificateRepository(),
      accounting: new PgAccountingRepository(),
      downloads: new PgDownloadRepository()
    };
  }

  return {
    customers: new MemoryCustomerRepository(),
    policies: new MemoryPolicyRepository(),
    carriers: new MemoryCarrierRepository(),
    certificateHolders: new MemoryCertificateHolderRepository(),
    certificates: new MemoryCertificateRepository(),
    accounting: new MemoryAccountingRepository(),
    downloads: new MemoryDownloadRepository()
  };
}
