const http = require('http');
const { promisify } = require('util');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.timeout = 5000;
  }

  addCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  async runChecks() {
    const results = {};
    const promises = [];

    for (const [name, checkFn] of this.checks) {
      promises.push(
        this.runSingleCheck(name, checkFn)
          .catch(error => ({ name, status: 'unhealthy', error: error.message }))
      );
    }

    const checkResults = await Promise.all(promises);
    
    for (const result of checkResults) {
      results[result.name] = {
        status: result.status,
        ...(result.error && { error: result.error }),
        ...(result.details && { details: result.details }),
        timestamp: new Date().toISOString()
      };
    }

    const allHealthy = Object.values(results).every(r => r.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  async runSingleCheck(name, checkFn) {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        checkFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
        )
      ]);
      
      return {
        name,
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: result
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }
}

// Redis health check
const redisHealthCheck = async () => {
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  
  try {
    await client.connect();
    const result = await client.ping();
    await client.quit();
    return { ping: result };
  } catch (error) {
    throw new Error(`Redis health check failed: ${error.message}`);
  }
};

// Cassandra health check
const cassandraHealthCheck = async () => {
  const cassandra = require('cassandra-driver');
  const client = new cassandra.Client({
    contactPoints: [process.env.CASSANDRA_HOST || 'localhost:9042'],
    localDataCenter: 'datacenter1',
    keyspace: process.env.CASSANDRA_KEYSPACE || 'paydash'
  });
  
  try {
    await client.connect();
    const result = await client.execute('SELECT now() FROM system.local');
    await client.shutdown();
    return { query: 'successful', time: result.rows[0] };
  } catch (error) {
    throw new Error(`Cassandra health check failed: ${error.message}`);
  }
};

// Kafka health check
const kafkaHealthCheck = async () => {
  const kafka = require('kafkajs').kafka({
    clientId: 'health-check',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
  });
  
  const admin = kafka.admin();
  
  try {
    await admin.connect();
    const metadata = await admin.fetchTopicMetadata(['batch-events']);
    await admin.disconnect();
    return { topics: metadata.topics.length };
  } catch (error) {
    throw new Error(`Kafka health check failed: ${error.message}`);
  }
};

module.exports = {
  HealthCheckService,
  redisHealthCheck,
  cassandraHealthCheck,
  kafkaHealthCheck
};