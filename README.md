# StreamAudit - Real-Time Processing Analytics Platform

A comprehensive real-time analytics platform for monitoring audit processing workflows, audit trails, and business metrics. Built with a microservices architecture using TypeScript, React, Apache Flink, Kafka, ClickHouse, and Cassandra.

## Architecture Overview

StreamAudit implements an event-driven architecture designed for high-throughput audit processing analytics:

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ Event Generator │────│    Kafka     │────│ Event Processor │────│  ClickHouse  │
│  (Spring Boot)  │    │              │    │  (Apache Flink) │    │ (Analytics)  │
└─────────────────┘    └──────────────┘    └─────────────────┘    └──────────────┘
                             │
                       ┌─────────────┐      ┌─────────────────┐    ┌──────────────┐
                       │   Backend   │──────│   Cassandra     │    │    Redis     │
                       │ (Express.js)│      │ (Audit Storage) │    │   (Cache)    │
                       └─────────────┘      └─────────────────┘    └──────────────┘
                             │
                       ┌─────────────┐
                       │  React UI   │
                       │ (Dashboard) │
                       └─────────────┘
```

### Core Components

1. **Event Generator** - Simulates realistic processing events with domain specific metadata
2. **Apache Flink Event Processor** - Processes event streams and computes real-time metrics
3. **Backend API** - Express.js server with REST endpoints and Server-Sent Events
4. **React Dashboard** - Real-time analytics interface with three main sections
5. **Data Layer** - Multi-database architecture optimized for different use cases

## Features

### Dashboard Sections

#### 1. Queue Management Dashboard
- Real-time queue processing status
- Batch object lifecycle tracking
- Queue statistics and performance metrics
- Manual queue operations

#### 2. Item Audits
- Detailed audit trail for individual items
- Status progression tracking
- Search and filter capabilities
- Processing history and metadata

#### 3. Business Metrics (Real-time Analytics)
- **Today's Summary**: Total events, amounts, success rates
- **Company Performance**: Revenue and success metrics by company
- **Real-time Event Feed**: Live processing updates via SSE
- **Performance Analytics**: Processing times and throughput metrics
- **Hourly Trends**: Time-series analysis of transaction patterns

### Real-Time Data Flow

The Business Metrics system processes events through the following pipeline:

1. **Event Generation**: Spring Boot service generates realistic batch and item events
2. **Stream Processing**: Apache Flink processes completion events in real-time
3. **Analytics Storage**: ClickHouse stores aggregated metrics for fast querying
4. **Live Updates**: Server-Sent Events push updates to the UI every 10 seconds
5. **Interactive Dashboard**: React components display real-time business insights

## Technology Stack

### Backend Services
- **Event Generator**: Spring Boot 2.7+ with Kafka integration
- **Event Processor**: Apache Flink 1.18+ with ClickHouse sink
- **API Server**: Express.js with TypeScript
- **Message Broker**: Apache Kafka 7.5+
- **Analytics Database**: ClickHouse (columnar, optimized for aggregations)
- **Operational Database**: Cassandra 4.1 (audit trail storage)
- **Cache Layer**: Redis 7+ (queue management)

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: React hooks with custom state management
- **Real-time Updates**: Server-Sent Events (SSE)
- **Styling**: Tailwind CSS with professional dashboard design
- **Charts**: Custom chart components with responsive design
- **Icons**: Heroicons for consistent UI elements

### Infrastructure
- **Containerization**: Docker Compose orchestration
- **Development**: Hot-reload development environment
- **Build System**: TypeScript compilation with multi-stage Docker builds

## Development Setup

### Prerequisites
- Node.js 18+
- Java 21+ (for Spring Boot services)
- Docker and Docker Compose
- Gradle (for Java builds)

### Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repo>
   cd 
   chmod +x dev.sh
   ```

2. **Start complete development environment:**
   ```bash
   ./dev.sh
   ```
   
   This automated script will:
   - Start all infrastructure services (Kafka, ClickHouse, Cassandra, Redis)
   - Build and start the Event Processor (Apache Flink)
   - Build and start the Event Generator (Spring Boot)
   - Install dependencies and start the backend API
   - Start the React development server with hot reload

3. **Access the application:**
   - **Main Dashboard**: http://localhost:5173
   - **Backend API**: http://localhost:3001/api
   - **Kafka UI**: http://localhost:3090 (for debugging)

### Manual Development

For granular control over services:

```bash
# Infrastructure services
docker-compose up -d

# Event Processor (Flink)
cd event-processor && ./gradlew run

# Event Generator (Spring Boot)
cd event-generator && ./gradlew bootRun

# Backend API + Frontend
npm run install:all
npm run dev
```

## API Documentation

### Queue Management
- `GET /api/queue` - Retrieve queue objects with pagination
- `GET /api/queue/stats` - Queue statistics and health metrics
- `DELETE /api/queue/clear` - Clear queue data (development only)

### Audit System
- `GET /api/audit` - Retrieve audit entries with filtering
- `GET /api/audit/object/:type/:id` - Get audit trail for specific object

### Business Metrics
- `GET /api/metrics/today-summary` - Daily metrics summary
- `GET /api/metrics/company-breakdown` - Revenue and performance by company
- `GET /api/metrics/hourly-trends` - Time-series data for the last 24 hours
- `GET /api/metrics/live-events` - Recent completion events
- `GET /api/metrics/performance` - Processing time analytics
- `GET /api/metrics/health` - Metrics system health check
- `GET /api/metrics/stream` - Server-Sent Events endpoint for real-time updates

### Server-Sent Events (SSE)

The Business Metrics dashboard uses Server-Sent Events for real-time updates without Redis dependency:

- **Connection**: Established on dashboard load via `/api/metrics/stream`
- **Update Frequency**: Every 10 seconds
- **Data**: Includes summary metrics, company breakdown, and recent events
- **Fallback**: Automatic retry with exponential backoff on connection failure
- **Client-side**: React hook (`useMetrics`) manages SSE lifecycle

**SSE Implementation**: Native Express.js SSE without external dependencies, providing efficient real-time data streaming directly from ClickHouse queries.

## Data Models

### Event Processing Pipeline

1. **Batch Events**: High-level processing containers
2. **Item Events**: Individual audit records with financial data
3. **Completion Events**: Terminal states (COMPLETE/INVALID) trigger metrics
4. **Metrics Events**: Aggregated data stored in ClickHouse

### Business Metrics Schema

```sql
-- ClickHouse analytics table
CREATE TABLE audit_completions (
    event_id String,
    audit_id String,
    batch_id String,
    company_id String,
    company_name String,
    amount Decimal(10,2),
    status String,
    outcome String,
    completed_at DateTime,
    processing_time_ms UInt32
) ENGINE = MergeTree()
ORDER BY (completed_at, company_id);
```

## Production Deployment

### Docker Compose (Complete Stack)
```bash
docker-compose up --build -d
```

### Individual Service Scaling
```bash
# Scale event processors
docker-compose up --scale event-processor=3

# Scale backend API
docker-compose up --scale backend=2
```

### Environment Configuration

```bash
# Core Services
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
CLICKHOUSE_URL=http://localhost:8123
CASSANDRA_HOST=localhost:9042
REDIS_URL=redis://localhost:6379

# Application Settings
PORT=3001
NODE_ENV=production
RECORD_INSERT_INTERVAL_SECONDS=10

# Event Processing
BATCH_SIZE_MIN=2
BATCH_SIZE_MAX=5
FLINK_CHECKPOINT_INTERVAL=10000
```

## Performance Characteristics

### Real-Time Processing
- **Event Throughput**: 1000+ events/second via Flink
- **Query Performance**: Sub-second aggregation queries via ClickHouse
- **UI Updates**: 10-second SSE intervals with minimal latency
- **Storage Efficiency**: Columnar storage optimized for analytics workloads

### Scalability
- **Horizontal Scaling**: Kafka partitioning supports multiple Flink instances
- **Data Retention**: Configurable retention policies in ClickHouse
- **Caching Strategy**: Redis for operational data, ClickHouse for analytics
- **Connection Pooling**: Optimized database connections across services

## Monitoring and Observability

### Health Checks
- Service-level health endpoints for all components
- ClickHouse connectivity monitoring
- Kafka consumer lag tracking
- Real-time processing statistics

### Logging
- Structured logging across all services
- Event processing metrics and error rates
- Performance monitoring for critical paths
- Debug-level tracing for development

## Testing

```bash
# Complete test suite
npm test

# Service-specific tests
npm run test:server    # Backend API tests
npm run test:client    # React component tests
cd event-processor && ./gradlew test    # Flink processor tests
cd event-generator && ./gradlew test    # Spring Boot tests

# Integration testing
npm run test:integration
```

## Architecture Design Decisions

### Event-Driven Architecture
- **Kafka**: Chosen for reliable event streaming with ordering guarantees
- **Apache Flink**: Stream processing with exactly-once semantics
- **ClickHouse**: Optimized for real-time analytics queries at scale

### Multi-Database Strategy
- **ClickHouse**: Analytical workloads, time-series data, aggregations
- **Cassandra**: Audit trails, high-write throughput, data durability
- **Redis**: Caching, session management, queue coordination

### Real-Time Updates
- **Server-Sent Events**: Lightweight, browser-native real-time communication
- **No WebSocket Dependency**: Simplified architecture with automatic reconnection
- **Direct Database Queries**: No intermediate message bus for metrics updates

### Microservices Design
- **Service Isolation**: Independent scaling and deployment
- **Event Sourcing**: Complete audit trail with event replay capability  
- **API Gateway Pattern**: Unified frontend API with backend service orchestration
- **Fault Tolerance**: Circuit breakers, retries, and graceful degradation

This architecture supports enterprise-scale event processing analytics with real-time insights, comprehensive audit capabilities, and operational monitoring suitable for financial services environments.