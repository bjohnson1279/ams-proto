import { Router } from 'express';
import { CertificateController } from '../controllers/certificate.controller.js';

const certificateRouter = Router();
const holderRouter = Router();
const controller = new CertificateController();

// CERTIFICATES ENDPOINTS (/api/v1/certificates)
certificateRouter.get('/', controller.getCertificates);
certificateRouter.post('/', controller.createCertificate);
certificateRouter.post('/bulk-issue', controller.bulkIssueCertificates);
certificateRouter.get('/holders', controller.getCertificateHolders);
certificateRouter.post('/holders', controller.createCertificateHolder);
certificateRouter.get('/:id', controller.getCertificateById);
certificateRouter.get('/:id/render', controller.renderCertificateHtml);

// HOLDER DEDICATED ENDPOINTS (/api/v1/holders)
holderRouter.get('/', controller.getCertificateHolders);
holderRouter.post('/', controller.createCertificateHolder);
holderRouter.get('/:id', controller.getCertificateHolderById);

export { certificateRouter, holderRouter };
export default certificateRouter;
