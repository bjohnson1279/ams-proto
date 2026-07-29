import { Router } from 'express';
import customerRoutes from './customer.routes.js';
import policyRoutes from './policy.routes.js';
import integrationRoutes from './integration.routes.js';
import { AmsService } from '../services/ams.service.js';

const router = Router();

router.use('/customers', customerRoutes);
router.use('/policies', policyRoutes);
router.use('/integration', integrationRoutes);

// Additional helper endpoints for carrier and claim inspection
router.get('/carriers', (req, res) => {
  const amsService = AmsService.getInstance();
  res.json({
    status: 'success',
    data: amsService.getCarriers()
  });
});

export default router;
