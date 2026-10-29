import { Router } from 'express';
import { z } from 'zod';
import { CustomerController } from '../controllers/customer.controller.js';
import { validate } from '../middleware/validate.middleware.js';

const router: Router = Router();
const controller = new CustomerController();

// 🛡️ Sentinel: Enforce strict input validation on Customer creation to prevent malformed data
const createCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    businessName: z.string().optional(),
    entityType: z.enum(['Individual', 'Commercial']).optional(),
    dba: z.string().optional(),
    feinOrSsn: z.string().optional(),
    address: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
    contactInfo: z.object({
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
    }).optional(),
  }).refine((data) => data.businessName || data.lastName, {
    message: "Must provide either businessName or lastName",
    path: ["businessName"], // point error at businessName
  })
});

router.get('/', controller.getCustomers);
router.post('/', validate(createCustomerSchema), controller.createCustomer);
router.get('/:id', controller.getCustomerById);

export default router;
