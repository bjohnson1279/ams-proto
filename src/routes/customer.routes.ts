import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';

const router: Router = Router();
const controller = new CustomerController();

router.get('/', controller.getCustomers);
router.post('/', controller.createCustomer);
router.get('/:id', controller.getCustomerById);

export default router;
