import express from 'express';
import request from 'supertest';
import { createMonitoringRoutes } from '../monitoring';

const app = express();
app.use('/monitoring', createMonitoringRoutes());

describe('Monitoring Routes', () => {
  describe('GET /monitoring/health', () => {
    it('should return a healthy status', async () => {
      const res = await request(app).get('/monitoring/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.checks).toHaveProperty('application');
      expect(res.body.checks).toHaveProperty('redis');
      expect(res.body.checks).toHaveProperty('cassandra');
    });
  });

  describe('GET /monitoring/health/:service', () => {
    it('should return the health of a specific service', async () => {
      const res = await request(app).get('/monitoring/health/application');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });

    it('should return 404 for a non-existent service', async () => {
      const res = await request(app).get('/monitoring/health/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /monitoring/metrics', () => {
    it('should return metrics in plain text', async () => {
      const res = await request(app).get('/monitoring/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('paydash_uptime_seconds');
    });
  });

  describe('GET /monitoring/info', () => {
    it('should return application info', async () => {
      const res = await request(app).get('/monitoring/info');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Paydash Backend');
    });
  });

  describe('GET /monitoring/readiness', () => {
    it('should return a ready status', async () => {
      const res = await request(app).get('/monitoring/readiness');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });
  });

  describe('GET /monitoring/liveness', () => {
    it('should return an alive status', async () => {
      const res = await request(app).get('/monitoring/liveness');
      expect(res.status).toBe(200);
      expect(res.body.alive).toBe(true);
    });
  });
});
