import { Request, Response, NextFunction } from 'express';
import { AmsService } from '../services/ams.service.js';

export class CustomerController {
  private amsService: AmsService;

  constructor() {
    this.amsService = AmsService.getInstance();
  }

  public getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, policyNumber } = req.query;
      const customers = this.amsService.getCustomers({
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
      const { id } = req.params;
      const customer = this.amsService.getCustomerById(id);
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
      const payload = req.body;
      if (!payload || (!payload.businessName && !payload.lastName)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid customer payload. Must provide businessName or lastName.'
        });
        return;
      }

      const created = this.amsService.createCustomer(payload);
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
