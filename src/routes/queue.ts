import { Router, Request, Response } from 'express';
import { RedisService } from '../services';
import { logger } from '../utils';

const router = Router();

export const createQueueRoutes = (redisService: RedisService): Router => {
  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const objects = await redisService.getQueueObjects(limit);
      
      res.json({
        success: true,
        data: objects,
        count: objects.length
      });
    } catch (error) {
      logger.error('Error fetching queue objects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch queue objects'
      });
    }
  });

  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const objects = await redisService.getQueueObjects(1000);
      const stats = {
        total: objects.length,
        byStatus: objects.reduce((acc, obj) => {
          acc[obj.status] = (acc[obj.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byOutcome: objects.reduce((acc, obj) => {
          if (obj.outcome) {
            acc[obj.outcome] = (acc[obj.outcome] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>),
        totalRecords: objects.reduce((sum, obj) => sum + obj.records, 0)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching queue stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch queue stats'
      });
    }
  });

  router.delete('/clear', async (req: Request, res: Response) => {
    try {
      await redisService.clearQueue();
      res.json({
        success: true,
        message: 'Queue cleared successfully'
      });
    } catch (error) {
      logger.error('Error clearing queue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear queue'
      });
    }
  });

  return router;
};