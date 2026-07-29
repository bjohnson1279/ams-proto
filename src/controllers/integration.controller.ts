import { Request, Response, NextFunction } from 'express';
import { AmsService } from '../services/ams.service.js';
import { IngestionPayload } from '../types/legacy.js';

export class IntegrationController {
  private amsService: AmsService;

  constructor() {
    this.amsService = AmsService.getInstance();
  }

  public importLegacyPayload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body as IngestionPayload;

      if (!payload || !payload.data) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid legacy ingestion payload. Missing "data" field.'
        });
        return;
      }

      const crosswalkResult = this.amsService.importLegacyPayload(payload);

      const hasCriticalExceptions = crosswalkResult.exceptions.some(e => e.severity === 'CRITICAL');

      res.status(hasCriticalExceptions ? 207 : 200).json({
        status: hasCriticalExceptions ? 'partial_success' : 'success',
        message: `Legacy ${crosswalkResult.systemSource} ingestion processing complete.`,
        summary: {
          systemSource: crosswalkResult.systemSource,
          totalRecordsProcessed: crosswalkResult.totalRecordsProcessed,
          successfullyTransformedCustomers: crosswalkResult.successfullyTransformedCustomers,
          successfullyTransformedPolicies: crosswalkResult.successfullyTransformedPolicies,
          totalLogs: crosswalkResult.logs.length,
          totalExceptions: crosswalkResult.exceptions.length
        },
        result: crosswalkResult
      });
    } catch (err) {
      next(err);
    }
  };
}
