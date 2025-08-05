import { Router, Request, Response } from 'express';
import { clickHouseService } from '../services/ClickHouseService';
import { logger } from '../utils/logger';

const router = Router();

// Helper function to check ClickHouse health
const ensureHealthy = async (): Promise<boolean> => {
    try {
        const isHealthy = await clickHouseService.isHealthy();
        if (!isHealthy) {
            logger.warn('ClickHouse service is not healthy, attempting to reconnect...');
            await clickHouseService.connect();
        }
        return true;
    } catch (error) {
        logger.error('ClickHouse health check failed:', error);
        return false;
    }
};

/**
 * GET /api/metrics/today-summary
 * Returns today's key metrics summary
 */
router.get('/today-summary', async (req: Request, res: Response): Promise<void> => {
    try {
        const isHealthy = await ensureHealthy();
        if (!isHealthy) {
            res.status(503).json({
                success: false,
                error: 'Metrics service unavailable',
                message: 'ClickHouse connection failed'
            });
            return;
        }

        const summary = await clickHouseService.getTodaySummary();
        
        res.json({
            success: true,
            data: summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching today summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch today summary',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/metrics/company-breakdown
 * Returns metrics breakdown by company
 */
router.get('/company-breakdown', async (req: Request, res: Response) => {
    try {
        const breakdown = await clickHouseService.getCompanyBreakdown();
        
        res.json({
            success: true,
            data: breakdown,
            count: breakdown.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching company breakdown:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch company breakdown',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/metrics/hourly-trends
 * Returns hourly trends for the last 24 hours
 */
router.get('/hourly-trends', async (req: Request, res: Response) => {
    try {
        const trends = await clickHouseService.getHourlyTrends();
        
        res.json({
            success: true,
            data: trends,
            count: trends.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching hourly trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hourly trends',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/metrics/live-events
 * Returns recent completion events
 */
router.get('/live-events', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const events = await clickHouseService.getRecentEvents(Math.min(limit, 100));
        
        res.json({
            success: true,
            data: events,
            count: events.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching live events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live events',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/metrics/performance
 * Returns processing time performance metrics
 */
router.get('/performance', async (req: Request, res: Response) => {
    try {
        const performance = await clickHouseService.getPerformanceMetrics();
        
        res.json({
            success: true,
            data: performance,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error fetching performance metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance metrics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/metrics/health
 * Returns metrics service health status
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const isHealthy = await clickHouseService.isHealthy();
        const eventCount = await clickHouseService.getEventCount();
        
        res.json({
            success: true,
            data: {
                status: isHealthy ? 'healthy' : 'unhealthy',
                clickhouse_connected: isHealthy,
                total_events: eventCount,
                last_check: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Error checking metrics health:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check metrics health',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/metrics/stream
 * Server-Sent Events endpoint for real-time metrics updates
 */
router.get('/stream', async (req: Request, res: Response) => {
    // Set headers for Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Function to send metrics updates
    const sendUpdate = async () => {
        try {
            // Get current metrics
            const [summary, breakdown, recent] = await Promise.all([
                clickHouseService.getTodaySummary(),
                clickHouseService.getCompanyBreakdown(),
                clickHouseService.getRecentEvents(5)
            ]);

            const updateData = {
                type: 'metrics-update',
                timestamp: new Date().toISOString(),
                data: {
                    summary,
                    breakdown: breakdown.slice(0, 5), // Top 5 companies
                    recent
                }
            };

            res.write(`data: ${JSON.stringify(updateData)}\n\n`);
        } catch (error) {
            logger.error('Error sending SSE update:', error);
            res.write(`data: ${JSON.stringify({
                type: 'error',
                timestamp: new Date().toISOString(),
                message: 'Failed to fetch metrics update'
            })}\n\n`);
        }
    };

    // Send initial update
    await sendUpdate();

    // Set up periodic updates (every 10 seconds)
    const interval = setInterval(sendUpdate, 10000);

    // Handle client disconnect
    req.on('close', () => {
        clearInterval(interval);
        logger.debug('SSE client disconnected');
    });

    req.on('error', (error) => {
        clearInterval(interval);
        logger.error('SSE connection error:', error);
    });
});

export default router;