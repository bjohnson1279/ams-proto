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
          message: 'Invalid legacy ingestion payload. Missing "data" field.',
        });
        return;
      }

      const crosswalkResult = await this.amsService.importLegacyPayload((req as any).tenantId || 'tenant-001', payload);
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
          totalExceptions: crosswalkResult.exceptions.length,
          totalDeduplicationMatches: crosswalkResult.deduplicationMatches?.length || 0,
        },
        result: crosswalkResult,
      });
    } catch (err) {
      next(err);
    }
  };

  public dryRunImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body as IngestionPayload;

      if (!payload || !payload.data) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid legacy ingestion payload. Missing "data" field.',
        });
        return;
      }

      const crosswalkResult = await this.amsService.dryRunImport((req as any).tenantId || 'tenant-001', payload);
      const hasCriticalExceptions = crosswalkResult.exceptions.some(e => e.severity === 'CRITICAL');

      res.status(hasCriticalExceptions ? 207 : 200).json({
        status: hasCriticalExceptions ? 'partial_success' : 'success',
        message: `Dry-Run preview analysis for ${crosswalkResult.systemSource} completed. No changes committed to Core AMS.`,
        summary: {
          systemSource: crosswalkResult.systemSource,
          dryRun: true,
          totalRecordsProcessed: crosswalkResult.totalRecordsProcessed,
          successfullyTransformedCustomers: crosswalkResult.successfullyTransformedCustomers,
          successfullyTransformedPolicies: crosswalkResult.successfullyTransformedPolicies,
          totalLogs: crosswalkResult.logs.length,
          totalExceptions: crosswalkResult.exceptions.length,
          totalDeduplicationMatches: crosswalkResult.deduplicationMatches?.length || 0,
        },
        result: crosswalkResult,
      });
    } catch (err) {
      next(err);
    }
  };

  public getCrosswalkMatrix = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matrix = await this.amsService.getCrosswalkMatrix((req as any).tenantId || 'tenant-001');
      res.status(200).json({
        status: 'success',
        count: matrix.length,
        matrix,
      });
    } catch (err) {
      next(err);
    }
  };
}
