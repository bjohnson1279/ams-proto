import { Request, Response, NextFunction } from 'express';
import { AmsService } from '../services/ams.service.js';
import { TenantRequest } from '../middleware/tenant.middleware.js';
import { z } from 'zod';

const customerCreateSchema = z.object({
  customerId: z.string().trim().optional(),
  entityType: z.enum(['Individual', 'Commercial']).optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  businessName: z.string().trim().optional(),
  dba: z.string().trim().optional(),
  feinOrSsn: z.string().trim().optional(),
  address: z.object({
    street1: z.string().trim(),
    street2: z.string().trim().optional(),
    city: z.string().trim(),
    state: z.string().trim(),
    postalCode: z.string().trim(),
    country: z.string().trim()
  }).optional(),
  contactInfo: z.object({
    email: z.string().email().or(z.literal('')),
    phone: z.string().trim(),
    mobile: z.string().trim().optional()
  }).optional(),
  status: z.enum(['Active', 'Inactive', 'Prospect']).optional()
}).refine(data => data.businessName || data.lastName, {
  message: "Must provide either businessName or lastName",
  path: ["businessName"]
});

export class CustomerController {
  private amsService: AmsService;

  constructor() {
    this.amsService = AmsService.getInstance();
  }

  public getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId as string;
      const { name, policyNumber } = req.query;
      const customers = await this.amsService.getCustomers(tenantId, {
        name: typeof name === 'string' ? name : undefined,
        policyNumber: typeof policyNumber === 'string' ? policyNumber : undefined
      });

      res.status(200).json({
        status: 'success',
        count: customers.length,
        data: customers
      });
    } catch (err) {
      next(err);
    }
  };

  public getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId as string;
      const { id } = req.params;
      const customer = await this.amsService.getCustomerById(tenantId, id);
      if (!customer) {
        res.status(404).json({
          status: 'error',
          message: `Customer with ID '${id}' not found.`
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: customer
      });
    } catch (err) {
      next(err);
    }
  };

  public createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as TenantRequest).tenantId as string;

      // 🛡️ Sentinel: Enforce strict input validation to prevent malformed data and injection attacks
      const validationResult = customerCreateSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid customer payload.',
          errors: validationResult.error.errors
        });
        return;
      }

      const payload = validationResult.data;

      const created = await this.amsService.createCustomer(tenantId, payload as any);
      res.status(201).json({
        status: 'success',
        message: 'Customer successfully registered in Core AMS.',
        data: created
      });
    } catch (err) {
      next(err);
    }
  };
}
