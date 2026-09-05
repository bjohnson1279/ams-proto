import { Request, Response, NextFunction } from 'express';
import { CertificateService } from '../services/certificate.service.js';
import { TenantRequest } from '../middleware/tenant.middleware.js';

export class CertificateController {
  private certificateService: CertificateService;

  constructor() {
    this.certificateService = CertificateService.getInstance();
  }

  public getCertificates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { customerId, holderId, status } = req.query;

      const certs = await this.certificateService.getCertificates(tenantId, {
        customerId: typeof customerId === 'string' ? customerId : undefined,
        holderId: typeof holderId === 'string' ? holderId : undefined,
        status: typeof status === 'string' ? status : undefined
      });

      res.status(200).json({
        status: 'success',
        count: certs.length,
        data: certs
      });
    } catch (err) {
      next(err);
    }
  };

  public getCertificateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const cert = await this.certificateService.getCertificateById(tenantId, id);
      if (!cert) {
        res.status(404).json({
          status: 'error',
          message: `Certificate with ID '${id}' not found.`
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: cert
      });
    } catch (err) {
      next(err);
    }
  };

  public renderCertificateHtml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const html = await this.certificateService.renderAcord25Html(tenantId, id);
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: err.message
        });
        return;
      }
      next(err);
    }
  };

  public createCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { customerId, holderId, policyIds, descriptionOfOperations, cancellationNoticeDays } = req.body;

      if (!customerId || !holderId) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid certificate payload. Must specify customerId and holderId.'
        });
        return;
      }

      const newCert = await this.certificateService.generateCertificate(tenantId, {
        customerId,
        holderId,
        policyIds: Array.isArray(policyIds) ? policyIds : [],
        descriptionOfOperations,
        cancellationNoticeDays: cancellationNoticeDays ? Number(cancellationNoticeDays) : 30
      });

      res.status(201).json({
        status: 'success',
        message: 'ACORD 25 Certificate of Insurance generated successfully.',
        data: newCert
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        message: err.message || 'Failed to generate certificate.'
      });
    }
  };

  public bulkIssueCertificates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { customerId, holderIds, policyIds, descriptionOfOperations, cancellationNoticeDays } = req.body;

      if (!customerId || !Array.isArray(holderIds) || holderIds.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid bulk issue payload. Must specify customerId and an array of holderIds.'
        });
        return;
      }

      const issued = await this.certificateService.bulkIssueCertificates(tenantId, {
        customerId,
        holderIds,
        policyIds: Array.isArray(policyIds) ? policyIds : [],
        descriptionOfOperations,
        cancellationNoticeDays: cancellationNoticeDays ? Number(cancellationNoticeDays) : 30
      });

      res.status(201).json({
        status: 'success',
        message: `Bulk issued ${issued.length} ACORD 25 Certificates of Insurance.`,
        count: issued.length,
        data: issued
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        message: err.message || 'Failed bulk certificate issuance.'
      });
    }
  };

  public getCertificateHolders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { name } = req.query;
      const holders = await this.certificateService.getCertificateHolders(tenantId, {
        name: typeof name === 'string' ? name : undefined
      });

      res.status(200).json({
        status: 'success',
        count: holders.length,
        data: holders
      });
    } catch (err) {
      next(err);
    }
  };

  public createCertificateHolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const payload = req.body;
      if (!payload || !payload.name) {
        res.status(400).json({
          status: 'error',
          message: 'Certificate Holder payload must specify a name.'
        });
        return;
      }

      const newHolder = await this.certificateService.createCertificateHolder(tenantId, payload);
      res.status(201).json({
        status: 'success',
        message: 'Certificate Holder created successfully.',
        data: newHolder
      });
    } catch (err: any) {
      res.status(400).json({
        status: 'error',
        message: err.message || 'Failed to create Certificate Holder.'
      });
    }
  };

  public getCertificateHolderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const holder = await this.certificateService.getCertificateHolderById(tenantId, id);
      if (!holder) {
        res.status(404).json({
          status: 'error',
          message: `Certificate Holder with ID '${id}' not found.`
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: holder
      });
    } catch (err) {
      next(err);
    }
  };

  public updateCertificateHolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const payload = req.body;
      const updated = await this.certificateService.updateCertificateHolder(tenantId, id, payload);
      res.status(200).json({
        status: 'success',
        message: 'Certificate Holder updated successfully.',
        data: updated
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message });
      } else {
        res.status(400).json({ status: 'error', message: err.message || 'Failed to update Certificate Holder.' });
      }
    }
  };

  public deactivateCertificateHolder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      await this.certificateService.deactivateCertificateHolder(tenantId, id);
      res.status(200).json({
        status: 'success',
        message: 'Certificate Holder deactivated successfully.'
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message });
      } else {
        res.status(400).json({ status: 'error', message: err.message || 'Failed to deactivate Certificate Holder.' });
      }
    }
  };

  public revokeCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const { reason } = req.body;
      const revoked = await this.certificateService.revokeCertificate(tenantId, id, reason);
      res.status(200).json({
        status: 'success',
        message: 'Certificate revoked successfully.',
        data: revoked
      });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        res.status(404).json({ status: 'error', message: err.message });
      } else {
        res.status(400).json({ status: 'error', message: err.message || 'Failed to revoke Certificate.' });
      }
    }
  };
}
