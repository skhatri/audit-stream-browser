import { Router, Request, Response } from 'express';
import { CassandraService } from '../services';
import { logger } from '../utils';

const router = Router();

export const createAuditRoutes = (cassandraService: CassandraService): Router => {
  router.get('/object/:objectType/:objectId', async (req: Request, res: Response) => {
    try {
      const { objectType, objectId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const auditEntries = await cassandraService.getAuditEntriesByObjectId(objectType, objectId);
      
      res.json({
        success: true,
        data: auditEntries,
        count: auditEntries.length,
        objectType,
        objectId
      });
    } catch (error) {
      logger.error('Error fetching audit entries for object:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit entries for object'
      });
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const auditEntries = await cassandraService.getAllAuditEntries(limit);
      
      res.json({
        success: true,
        data: auditEntries,
        count: auditEntries.length
      });
    } catch (error) {
      logger.error('Error fetching all audit entries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit entries'
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
        const auditEntries = await cassandraService.getAllAuditEntries(limit);
        
        const data = {
          success: true,
          data: auditEntries,
          count: auditEntries.length,
          timestamp: new Date().toISOString()
        };

        if (isConnected && !res.destroyed) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (error) {
        logger.error('Error in audit SSE stream:', error);
        if (isConnected && !res.destroyed) {
          try {
            res.write(`data: ${JSON.stringify({ 
              success: false, 
              error: 'Failed to fetch audit data',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch (writeError) {
            logger.error('Failed to write error to audit SSE stream:', writeError);
            isConnected = false;
          }
        }
      }
    };

    const intervalId = setInterval(sendUpdate, 10000);

    sendUpdate();

    req.on('close', () => {
      isConnected = false;
      clearInterval(intervalId);
      logger.info('Audit SSE client disconnected');
    });

    req.on('error', (error) => {
      isConnected = false;
      logger.error('Audit SSE connection error:', error);
      clearInterval(intervalId);
    });

    res.on('error', (error) => {
      isConnected = false;
      logger.error('Audit SSE response error:', error);
      clearInterval(intervalId);
    });

    res.on('close', () => {
      isConnected = false;
      clearInterval(intervalId);
    });
  });

  return router;
};