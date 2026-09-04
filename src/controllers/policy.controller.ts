import { Request, Response, NextFunction } from 'express';
import { AmsService } from '../services/ams.service.js';
import { TenantRequest } from '../middleware/tenant.middleware.js';

export class PolicyController {
  private amsService: AmsService;

  constructor() {
    this.amsService = AmsService.getInstance();
  }

  public getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { carrierId, status, effectiveDate } = req.query;

      const policies = await this.amsService.getPolicies(tenantId, {
        carrierId: typeof carrierId === 'string' ? carrierId : undefined,
        status: typeof status === 'string' ? status : undefined,
        effectiveDate: typeof effectiveDate === 'string' ? effectiveDate : undefined
      });

      res.status(200).json({
        status: 'success',
        count: policies.length,
        data: policies
      });
    } catch (err) {
      next(err);
    }
  };

  public getPolicyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const policy = await this.amsService.getPolicyById(tenantId, id);
      if (!policy) {
        res.status(404).json({
          status: 'error',
          message: `Policy with ID '${id}' not found.`
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: policy
      });
    } catch (err) {
      next(err);
    }
  };

  public createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const payload = req.body;
      if (!payload || !payload.customerId || !payload.lineOfBusiness) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid policy payload. Must specify customerId and lineOfBusiness.'
        });
        return;
      }

      const created = await this.amsService.createPolicy(tenantId, payload);
      res.status(201).json({
        status: 'success',
        message: 'Policy created successfully.',
        data: created
      });
    } catch (err) {
      next(err);
    }
  };

  public getDecPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId || 'tenant-001';
      const { id } = req.params;
      const decPagePayload = await this.amsService.generateDecPage(tenantId, id);

      res.status(200).json({
        status: 'success',
        data: decPagePayload
      });
    } catch (err: any) {
      if (err?.message && err.message.includes('not found')) {
        res.status(404).json({
          status: 'error',
          message: err.message
        });
        return;
      }
      next(err);
    }
  };
}
