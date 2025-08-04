const client = require('prom-client');

class MetricsService {
  constructor() {
    this.register = new client.Registry();
    this.setupDefaultMetrics();
    this.setupCustomMetrics();
  }

  setupDefaultMetrics() {
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'paydash_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
  }

  setupCustomMetrics() {
    // Queue metrics
    this.queueLength = new client.Gauge({
      name: 'paydash_queue_length_total',
      help: 'Total number of items in the queue',
      labelNames: ['queue_type']
    });

    this.queueProcessingTime = new client.Histogram({
      name: 'paydash_queue_processing_duration_seconds',
      help: 'Time spent processing queue items',
      labelNames: ['status', 'outcome'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    // Event metrics
    this.eventsProduced = new client.Counter({
      name: 'paydash_events_produced_total',
      help: 'Total number of events produced to Kafka',
      labelNames: ['topic', 'event_type']
    });

    this.eventsConsumed = new client.Counter({
      name: 'paydash_events_consumed_total',
      help: 'Total number of events consumed from Kafka',
      labelNames: ['topic', 'event_type', 'status']
    });

    // Database metrics
    this.dbConnections = new client.Gauge({
      name: 'paydash_db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database_type']
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'paydash_db_query_duration_seconds',
      help: 'Database query execution time',
      labelNames: ['database_type', 'operation'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
    });

    // API metrics
    this.httpRequests = new client.Counter({
      name: 'paydash_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    this.httpDuration = new client.Histogram({
      name: 'paydash_http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10]
    });

    // Register all custom metrics
    this.register.registerMetric(this.queueLength);
    this.register.registerMetric(this.queueProcessingTime);
    this.register.registerMetric(this.eventsProduced);
    this.register.registerMetric(this.eventsConsumed);
    this.register.registerMetric(this.dbConnections);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.httpRequests);
    this.register.registerMetric(this.httpDuration);
  }

  // Helper methods for updating metrics
  updateQueueLength(type, length) {
    this.queueLength.set({ queue_type: type }, length);
  }

  recordQueueProcessing(status, outcome, duration) {
    this.queueProcessingTime.observe({ status, outcome }, duration);
  }

  incrementEventsProduced(topic, eventType) {
    this.eventsProduced.inc({ topic, event_type: eventType });
  }

  incrementEventsConsumed(topic, eventType, status = 'success') {
    this.eventsConsumed.inc({ topic, event_type: eventType, status });
  }

  setDbConnections(dbType, count) {
    this.dbConnections.set({ database_type: dbType }, count);
  }

  recordDbQuery(dbType, operation, duration) {
    this.dbQueryDuration.observe({ database_type: dbType, operation }, duration);
  }

  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequests.inc({ method, route, status_code: statusCode });
    this.httpDuration.observe({ method, route }, duration);
  }

  async getMetrics() {
    return await this.register.metrics();
  }
}

module.exports = { MetricsService };