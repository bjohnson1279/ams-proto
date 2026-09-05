import { Request, Response, NextFunction } from 'express';
import { CertificateService } from '../services/certificate.service.js';

export class CertificateController {
  private certificateService: CertificateService;

  constructor() {
    this.certificateService = CertificateService.getInstance();
  }

  public getCertificates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { customerId, holderId, status } = req.query;

      const certs = this.certificateService.getCertificates({
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
      const { id } = req.params;
      const cert = this.certificateService.getCertificateById(id);
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
      const { id } = req.params;
      const html = this.certificateService.renderAcord25Html(id);
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
      const { customerId, holderId, policyIds, descriptionOfOperations, cancellationNoticeDays } = req.body;

      if (!customerId || !holderId) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid certificate payload. Must specify customerId and holderId.'
        });
        return;
      }

      const newCert = this.certificateService.generateCertificate({
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
      const { customerId, holderIds, policyIds, descriptionOfOperations, cancellationNoticeDays } = req.body;

      if (!customerId || !Array.isArray(holderIds) || holderIds.length === 0) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid bulk issue payload. Must specify customerId and an array of holderIds.'
        });
        return;
      }

      const issued = this.certificateService.bulkIssueCertificates({
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
      const { name } = req.query;
      const holders = this.certificateService.getCertificateHolders({
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
      const payload = req.body;
      if (!payload || !payload.name) {
        res.status(400).json({
          status: 'error',
          message: 'Certificate Holder payload must specify a name.'
        });
        return;
      }

      const newHolder = this.certificateService.createCertificateHolder(payload);
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
      const { id } = req.params;
      const holder = this.certificateService.getCertificateHolderById(id);
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
}
