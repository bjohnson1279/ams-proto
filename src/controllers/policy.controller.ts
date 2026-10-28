import { Request, Response, NextFunction } from 'express';
import { AmsService } from '../services/ams.service.js';
import { TenantRequest } from '../middleware/tenant.middleware.js';
import { z } from 'zod';


const policyCreateSchema = z.object({
  policyId: z.string().trim().optional(),
  policyNumber: z.string().trim().optional(),
  customerId: z.string().trim(),
  carrierId: z.string().trim().optional(),
  lineOfBusiness: z.enum(['Commercial Auto', 'General Liability', 'Commercial Property', 'Workers Comp', 'BOP', 'Personal Auto', 'Homeowners']),
  effectiveDate: z.string().trim().optional(),
  expirationDate: z.string().trim().optional(),
  status: z.enum(['Active', 'Expired', 'Cancelled', 'Pending']).optional(),
  premiumAmount: z.number().or(z.string().transform((v) => Number(v))).optional(),
  billingType: z.enum(['Agency Bill', 'Direct Bill']).optional(),
  coverages: z.array(z.object({
    code: z.string(),
    name: z.string(),
    limitAmount: z.number(),
    deductibleAmount: z.number(),
    premiumAmount: z.number()
  })).optional()
});

export class PolicyController {
  private amsService: AmsService;

  constructor() {
    this.amsService = AmsService.getInstance();
  }

  public getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId as string;
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
      const tenantId = (req as TenantRequest).tenantId as string;
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
      const tenantId = (req as TenantRequest).tenantId as string;

      // 🛡️ Sentinel: Enforce strict input validation to prevent malformed data and injection attacks
      const validationResult = policyCreateSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid policy payload.',
          errors: validationResult.error.errors
        });
        return;
      }

      const payload = validationResult.data;

      const created = await this.amsService.createPolicy(tenantId, payload as Parameters<AmsService["createPolicy"]>[1]);
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
      const tenantId = (req as TenantRequest).tenantId as string;
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
          message: process.env.NODE_ENV === 'production' ? 'Policy not found.' : err.message
        });
        return;
      }
      next(err);
    }
  };
}
