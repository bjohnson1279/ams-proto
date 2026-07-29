import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller.js';

const router = Router();
const controller = new IntegrationController();

router.post('/import', controller.importLegacyPayload);

export default router;
