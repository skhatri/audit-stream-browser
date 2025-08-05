import { Router, Request, Response } from 'express';
import { RedisService, CassandraService } from '../services';
import { logger } from '../utils';

const router = Router();

export const createQueueRoutes = (redisService: RedisService, cassandraService: CassandraService): Router => {
  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const objects = await cassandraService.getBatchObjects(limit);
      
      res.json({
        success: true,
        data: objects,
        count: objects.length,
        source: 'cassandra'
      });
    } catch (error) {
      logger.error('Error fetching queue objects from Cassandra:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch queue objects from Cassandra'
      });
    }
  });

  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await cassandraService.getBatchObjectsStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching queue stats from Cassandra:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch queue stats from Cassandra'
      });
    }
  });

  router.delete('/clear', async (req: Request, res: Response) => {
    try {
      res.status(405).json({
        success: false,
        message: 'Queue clear operation disabled - data is now managed by Event-Generator'
      });
    } catch (error) {
      logger.error('Error clearing queue:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear queue'
      });
    }
  });

  router.get('/stream', async (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let isConnected = true;

    const sendUpdate = async () => {
      if (!isConnected || res.destroyed) return;
      
      try {
        const limit = parseInt(req.query.limit as string) || 100;
        const objects = await redisService.getQueueObjects(limit);
        
        const data = {
          success: true,
          data: objects,
          count: objects.length,
          timestamp: new Date().toISOString()
        };

        if (isConnected && !res.destroyed) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (error) {
        logger.error('Error in SSE stream:', error);
        if (isConnected && !res.destroyed) {
          try {
            res.write(`data: ${JSON.stringify({ 
              success: false, 
              error: 'Failed to fetch queue data',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch (writeError) {
            logger.error('Failed to write error to SSE stream:', writeError);
            isConnected = false;
          }
        }
      }
    };

    const intervalId = setInterval(sendUpdate, 5000);

    sendUpdate();

    req.on('close', () => {
      isConnected = false;
      clearInterval(intervalId);
      logger.info('SSE client disconnected');
    });

    req.on('error', (error) => {
      isConnected = false;
      logger.error('SSE connection error:', error);
      clearInterval(intervalId);
    });

    res.on('error', (error) => {
      isConnected = false;
      logger.error('SSE response error:', error);
      clearInterval(intervalId);
    });

    res.on('close', () => {
      isConnected = false;
      clearInterval(intervalId);
    });
  });

  router.get('/stats/stream', async (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let isStatsConnected = true;

    const sendStatsUpdate = async () => {
      if (!isStatsConnected || res.destroyed) return;
      
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

        const data = {
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        };

        if (isStatsConnected && !res.destroyed) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (error) {
        logger.error('Error in stats SSE stream:', error);
        if (isStatsConnected && !res.destroyed) {
          try {
            res.write(`data: ${JSON.stringify({ 
              success: false, 
              error: 'Failed to fetch stats data',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch (writeError) {
            logger.error('Failed to write error to stats SSE stream:', writeError);
            isStatsConnected = false;
          }
        }
      }
    };

    const intervalId = setInterval(sendStatsUpdate, 10000);

    sendStatsUpdate();

    req.on('close', () => {
      isStatsConnected = false;
      clearInterval(intervalId);
      logger.info('Stats SSE client disconnected');
    });

    req.on('error', (error) => {
      isStatsConnected = false;
      logger.error('Stats SSE connection error:', error);
      clearInterval(intervalId);
    });

    res.on('error', (error) => {
      isStatsConnected = false;
      logger.error('Stats SSE response error:', error);
      clearInterval(intervalId);
    });

    res.on('close', () => {
      isStatsConnected = false;
      clearInterval(intervalId);
    });
  });

  return router;
};