import { Request, Response, NextFunction } from 'express';
import { AmsService } from '../services/ams.service.js';

export class PolicyController {
  private amsService: AmsService;

  constructor() {
    this.amsService = AmsService.getInstance();
  }

  public getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { carrierId, status, effectiveDate } = req.query;

      const policies = this.amsService.getPolicies({
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
      const { id } = req.params;
      const policy = this.amsService.getPolicyById(id);
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
      const payload = req.body;
      if (!payload || !payload.customerId || !payload.lineOfBusiness) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid policy payload. Must specify customerId and lineOfBusiness.'
        });
        return;
      }

      const created = this.amsService.createPolicy(payload);
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
      const { id } = req.params;
      const decPagePayload = this.amsService.generateDecPage(id);

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
