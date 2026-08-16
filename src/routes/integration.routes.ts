import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller.js';

const router: Router = Router();
const controller = new IntegrationController();

router.post('/import', controller.importLegacyPayload);
router.post('/dry-run', controller.dryRunImport);
router.get('/crosswalk-matrix', controller.getCrosswalkMatrix);

export default router;
