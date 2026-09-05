import { Request, Response, NextFunction } from 'express';
import { CarrierDownloadService } from '../services/carrierDownload.service.js';
import { Al3ParserService } from '../services/al3Parser.service.js';

const downloadService = CarrierDownloadService.getInstance();
const al3Parser = Al3ParserService.getInstance();

export class DownloadController {
  public parseAl3(req: Request, res: Response, next: NextFunction): void {
    try {
      const { rawContent } = req.body;
      if (!rawContent) {
        res.status(400).json({ error: 'rawContent is required' });
        return;
      }

      const result = al3Parser.parseAl3Content(rawContent);
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }

  public getBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
      const batches = await downloadService.getBatches(tenantId);
      res.json(batches);
    } catch (err: any) {
      next(err);
    }
  };

  public getBatchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
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
      const tenantId = (req as any).tenantId || 'tenant-001';
      const payload = req.body;
      const batch = await downloadService.ingestDownloadBatch(tenantId, payload);
      res.status(201).json(batch);
    } catch (err: any) {
      next(err);
    }
  };

  public postCommissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
      const { batchId } = req.params;
      const batch = await downloadService.postBatchCommissions(tenantId, batchId);
      res.json(batch);
    } catch (err: any) {
      next(err);
    }
  };
}
