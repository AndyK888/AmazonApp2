# Troubleshooting Guide

This document provides solutions for common issues encountered when running the Inventory Management System.

## Worker Issues

### Error: `KeyError: 'delivery_tag'`

**Problem**: The Celery worker crashes with the following error:
```
CRITICAL/MainProcess Unrecoverable error: KeyError('delivery_tag')
```

**Cause**: The message format sent to Celery via Redis is missing the required `delivery_tag` property in the task message.

**Solution**: 
1. Ensure all task messages include the `delivery_tag` property in the `properties` object:
```typescript
const task = {
  id: taskId,
  task: 'process_report',
  args: [filePath, fileId],
  kwargs: {},
  properties: {
    delivery_mode: 2,
    correlation_id: taskId,
    delivery_tag: taskId  // This is required!
  }
};
```

2. Check all routes that send messages to Celery, particularly:
   - `/app/api/listings/upload/route.ts`
   - `/app/api/all-listings-report/upload/route.ts`

3. Restart the worker container after making changes:
```bash
docker compose restart worker
```

### Error: `KeyError: 'exchange'`

**Problem**: The Celery worker crashes with the following error:
```
KeyError: 'exchange'
```

**Cause**: The message format sent to Celery via Redis is missing the required `exchange` and `routing_key` properties.

**Solution**: 
1. Ensure all task messages include the `exchange` and `routing_key` properties:
```typescript
const task = {
  id: taskId,
  task: 'process_report',
  args: [filePath, fileId],
  kwargs: {},
  exchange: 'celery',
  routing_key: 'celery',
  properties: {
    delivery_mode: 2,
    correlation_id: taskId,
    delivery_tag: taskId
  }
};
```

2. For Celery workers, the default exchange and routing key should both be set to 'celery'.

3. Restart the worker container after making changes:
```bash
docker compose restart worker
```

### Warning: `pyarrow will become a required dependency of pandas`

**Problem**: The worker logs show a warning about pyarrow dependency.

**Cause**: This is a warning from pandas about a future requirement.

**Solution**: 
- This is a warning, not an error, and won't affect current functionality
- To eliminate the warning, add pyarrow to the worker's requirements.txt:
```
pandas==2.0.0
pyarrow==14.0.0
```

### Warning: `running the worker with superuser privileges`

**Problem**: The worker logs show a warning about running with superuser privileges.

**Cause**: The Celery worker is running as root inside the container.

**Solution**:
- This is a warning, not an error
- For production environments, modify the worker's Dockerfile to use a non-root user
- For development, this warning can be safely ignored

## Database Issues

### Error: `relation 'uploaded_files' does not exist`

**Problem**: The application shows an error about missing database tables.

**Cause**: The database initialization scripts did not run properly during container startup.

**Solution**:
1. Check if the database container is initialized correctly:
```bash
docker compose logs db
```

2. Ensure the initialization scripts are in the correct location:
```
db/init/01-init.sql
db/init/02-uploads-table.sql
db/init/03-identifier-tracking.sql
db/init/04-duplicates-tables.sql
```

3. If needed, reinitialize the database:
```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Recreate containers with fresh volumes
```

## Docker-Related Issues

### Changes not taking effect

**Problem**: Code changes are not reflected in the running application.

**Solution**:
1. Rebuild the affected containers:
```bash
docker compose build frontend worker
```

2. Restart the containers:
```bash
docker compose up -d
```

### Port conflicts

**Problem**: The application cannot start due to port conflicts.

**Solution**:
1. Check for running containers using the same ports:
```bash
docker ps
```

2. Stop conflicting containers or modify the port mapping in docker-compose.yml

## File Upload Issues

### Error: "File upload failed" or timeouts

**Problem**: File uploads fail or time out for large files.

**Solution**:
1. Check the maximum file size setting in Next.js configuration
2. Ensure adequate timeout settings for the API routes
3. Consider implementing chunked uploads for very large files

## Miscellaneous Issues

### Redis connection errors

**Problem**: The application shows Redis connection errors.

**Solution**:
1. Ensure Redis is running:
```bash
docker compose ps redis
```

2. Check Redis connection settings in the application
3. Restart Redis if needed:
```bash
docker compose restart redis
```

## Debugging Tools

### View container logs

```bash
docker compose logs [service_name]
```

### Access container shell

```bash
docker compose exec [service_name] sh
```

### Check database directly

```bash
docker compose exec db psql -U postgres -d amazon_inventory
```

### Inspect Redis

```bash
docker compose exec redis redis-cli
``` 