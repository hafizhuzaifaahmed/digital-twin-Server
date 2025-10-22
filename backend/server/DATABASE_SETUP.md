# Database Connection Pool Configuration

## Overview
This document explains how to configure the database connection pool to prevent P2028 transaction timeout errors during high concurrency load testing.

## Configuration Steps

### 1. Environment Variables
Copy `.env.example` to `.env` and update the DATABASE_URL with your MySQL connection details:

```bash
cp .env.example .env
```

### 2. Database URL Format
Use this optimized connection string format:

```
DATABASE_URL="mysql://username:password@host:port/database?connection_limit=100&pool_timeout=20&socket_timeout=60"
```

### 3. Connection Pool Parameters

- **connection_limit=100**: Maximum number of connections in the pool
  - Allows up to 100 concurrent database connections
  - Prevents connection exhaustion under high load
  
- **pool_timeout=20**: Seconds to wait for a connection from the pool
  - Prevents indefinite waiting for connections
  - Balances responsiveness with resource availability
  
- **socket_timeout=60**: Seconds before timing out socket operations
  - Prevents hanging connections
  - Ensures proper cleanup of stale connections

### 4. MySQL Server Configuration
Ensure your MySQL server can handle the increased connection load:

```sql
-- Check current settings
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Recommended settings for high concurrency
SET GLOBAL max_connections = 200;  -- At least 2x the connection_limit
SET GLOBAL innodb_buffer_pool_size = 1073741824;  -- 1GB or more
```

### 5. Application Features

#### Retry Logic
The application includes automatic retry logic for P2028 transaction timeout errors:
- Configured in `PrismaService.executeWithRetry()`
- Retries up to 3 times with exponential backoff
- Used in all TaskService transaction operations

#### Transaction Optimization
- All database operations use proper transaction scoping
- Critical operations (create, update, delete) use retry wrapper
- Foreign key relationships are handled in correct order

### 6. Load Testing Recommendations

1. **Gradual Ramp-up**: Start with lower concurrent users and gradually increase
2. **Monitor Connections**: Watch MySQL connection count during tests
3. **Check Logs**: Monitor for P2028 errors and connection pool exhaustion
4. **Adjust Parameters**: Fine-tune pool settings based on test results

### 7. Troubleshooting

#### Common Issues:
- **P2028 Errors**: Increase `connection_limit` or `pool_timeout`
- **Connection Refused**: Check MySQL `max_connections` setting
- **Slow Queries**: Optimize database indexes and query performance
- **Memory Issues**: Adjust MySQL `innodb_buffer_pool_size`

#### Monitoring Commands:
```sql
-- Check active connections
SHOW PROCESSLIST;

-- Check connection statistics
SHOW STATUS LIKE 'Connections';
SHOW STATUS LIKE 'Max_used_connections';
```

### 8. Restart Application
After updating the .env file, restart the application:

```bash
npm run start:dev
```

The new connection pool settings will take effect immediately.
