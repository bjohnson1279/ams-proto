import { Request, Response, NextFunction } from 'express';
import { CarrierDownloadService } from '../services/carrierDownload.service.js';
import { Al3ParserService } from '../services/al3Parser.service.js';
import { z } from 'zod';

const downloadService = CarrierDownloadService.getInstance();
const al3Parser = Al3ParserService.getInstance();


const parseAl3Schema = z.object({
  rawContent: z.string().trim().min(1, 'rawContent is required')
});

const ingestBatchSchema = z.object({
  carrierCode: z.string().trim(),
  carrierName: z.string().trim(),
  source: z.enum(['IVANS Exchange', 'Direct Download', 'AL3 Upload Simulation']).optional(),
  rawAl3Content: z.string().trim().optional(),
  items: z.array(z.object({
    policyNumber: z.string().trim(),
    insuredName: z.string().trim(),
    insuredFeinOrSsn: z.string().trim().optional(),
    lineOfBusiness: z.string().trim(),
    transactionType: z.enum(['NEWB', 'RENE', 'ENDO', 'CANC', 'REVT', 'DBST']),
    effectiveDate: z.string().trim(),
    grossPremium: z.number(),
    commissionRate: z.number().optional()
  })).optional()
});

export class DownloadController {
  public parseAl3(req: Request, res: Response, next: NextFunction): void {
    try {
      // 🛡️ Sentinel: Enforce strict input validation to prevent malformed data and injection attacks
      const validationResult = parseAl3Schema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid AL3 payload.',
          errors: validationResult.error.issues
        });
        return;
      }

      const result = al3Parser.parseAl3Content(validationResult.data.rawContent);
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }

  public getBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId as string;
      const batches = await downloadService.getBatches(tenantId);
      res.json(batches);
    } catch (err: any) {
      next(err);
    }
  };

  public getBatchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId as string;
      const batch = await downloadService.getBatchById(tenantId, req.params.batchId);
      if (!batch) {
        res.status(404).json({ error: 'Batch not found' });
        return;
      }
      res.json(batch);
    } catch (err: any) {
      next(err);
    }
  };

  public ingestBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId as string;

      // 🛡️ Sentinel: Enforce strict input validation to prevent malformed data and injection attacks
      const validationResult = ingestBatchSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid batch ingestion payload.',
          errors: validationResult.error.issues
        });
        return;
      }

      const payload = validationResult.data;
      const batch = await downloadService.ingestDownloadBatch(tenantId, payload);
      res.status(201).json(batch);
    } catch (err: any) {
      next(err);
    }
  };

  public postCommissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId as string;
      const { batchId } = req.params;
      const batch = await downloadService.postBatchCommissions(tenantId, batchId);
      res.json(batch);
    } catch (err: any) {
      next(err);
    }
  };
}
