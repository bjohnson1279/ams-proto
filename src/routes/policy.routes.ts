import { Router } from 'express';
import { PolicyController } from '../controllers/policy.controller.js';

const router: Router = Router();
const controller = new PolicyController();

router.get('/', controller.getPolicies);
router.post('/', controller.createPolicy);
router.get('/:id', controller.getPolicyById);
router.get('/:id/dec-page', controller.getDecPage);

export default router;
