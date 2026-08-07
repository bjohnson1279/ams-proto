import { Request, Response } from 'express';
import { CarrierDownloadService } from '../services/carrierDownload.service.js';
import { Al3ParserService } from '../services/al3Parser.service.js';

const downloadService = CarrierDownloadService.getInstance();
const al3Parser = Al3ParserService.getInstance();

export class DownloadController {
  /**
   * Parse raw AL3 file string / stream
   */
  public parseAl3(req: Request, res: Response): void {
    try {
      const { rawContent } = req.body;
      if (!rawContent) {
        res.status(400).json({ error: 'rawContent is required' });
        return;
      }

      const result = al3Parser.parseAl3Content(rawContent);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * List download batches
   */
  public getBatches(req: Request, res: Response): void {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
      const batches = downloadService.getBatches(tenantId);
      res.json(batches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get single batch by ID
   */
  public getBatchById(req: Request, res: Response): void {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
      const batch = downloadService.getBatchById(req.params.batchId, tenantId);
      if (!batch) {
        res.status(404).json({ error: 'Batch not found' });
        return;
      }
      res.json(batch);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Ingest a new download batch or raw AL3 package
   */
  public ingestBatch(req: Request, res: Response): void {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
      const payload = req.body;
      const batch = downloadService.ingestDownloadBatch(payload, tenantId);
      res.status(201).json(batch);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Post direct-bill commissions to General Ledger
   */
  public postCommissions(req: Request, res: Response): void {
    try {
      const tenantId = (req as any).tenantId || 'tenant-001';
      const { batchId } = req.params;
      const batch = downloadService.postBatchCommissions(batchId, tenantId);
      res.json(batch);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
