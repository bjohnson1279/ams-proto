import { Router } from 'express';
import customerRoutes from './customer.routes.js';
import policyRoutes from './policy.routes.js';
import integrationRoutes from './integration.routes.js';
import accountingRoutes from './accounting.routes.js';
import { certificateRouter, holderRouter } from './certificate.routes.js';
import downloadRoutes from './download.routes.js';
import { AmsService } from '../services/ams.service.js';

const router = Router();

router.use('/customers', customerRoutes);
router.use('/policies', policyRoutes);
router.use('/integration', integrationRoutes);
router.use('/accounting', accountingRoutes);
router.use('/certificates', certificateRouter);
router.use('/holders', holderRouter);
router.use('/downloads', downloadRoutes);


// Additional helper endpoints for carrier and claim inspection
router.get('/carriers', (req, res) => {
  const amsService = AmsService.getInstance();
  res.json({
    status: 'success',
    data: amsService.getCarriers()
  });
});

export default router;
