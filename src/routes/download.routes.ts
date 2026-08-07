import { Router } from 'express';
import { DownloadController } from '../controllers/download.controller.js';

const router = Router();
const controller = new DownloadController();

router.post('/parse-al3', controller.parseAl3.bind(controller));
router.get('/batches', controller.getBatches.bind(controller));
router.get('/batches/:batchId', controller.getBatchById.bind(controller));
router.post('/ingest', controller.ingestBatch.bind(controller));
router.post('/batches/:batchId/post-commissions', controller.postCommissions.bind(controller));

export default router;
