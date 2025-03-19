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
1. The new Docker Compose configuration includes a dedicated initialization container (`db-init`) that verifies all required tables exist:
```bash
docker compose down
docker compose up -d
```

2. If the issue persists, you can manually trigger the verification process:
```bash
docker compose restart db-init
```

3. To manually run the scripts:
```bash
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/01-init.sql
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/02-uploads-table.sql
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/03-identifier-tracking.sql
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/04-duplicates-tables.sql
```

### Error: Database Schema Healthcheck Failing for 'listings' Table 

**Problem**: The database healthcheck script fails validation for the `listings` table, incorrectly reporting missing columns even when the database schema is correct.

**Cause**: The healthcheck script (`verify-tables-healthcheck.sh`) was using incorrect column names that didn't match the actual database schema. Specifically, it was looking for `seller_sku`, `asin`, and `title` columns, while the actual schema uses `seller-sku`, `asin1`, and `item-name`.

**Solution**:
1. The script has been updated to check for the correct column names:
```bash
# Correct column names in the healthcheck script
TABLE_COLUMNS["listings"]="id,seller-sku,asin1,item-name,price,quantity,status,fulfillment-channel"
```

2. If you encounter similar validation issues with other tables, verify the actual column names in the database:
```bash
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -c "\d listings"
# Compare the output with the column names in verify-tables-healthcheck.sh
```

3. To manually update the healthcheck script:
```bash
# Edit the file
vi amazon-app/db/init/verify-tables-healthcheck.sh

# Find the TABLE_COLUMNS declaration and update it with correct column names
# Then restart the db-init service
docker compose restart db-init
```

### Verifying Database Tables and Schemas

**Problem**: Need to verify if database tables are properly created with the correct schema.

**Solution**:
1. Use the built-in verification script to check all required tables:
```bash
docker exec -it amazon-app-db-1 bash /docker-entrypoint-initdb.d/verify-tables-healthcheck.sh
```

2. To check a specific table structure:
```bash
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -c "\d listings"
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -c "\d uploaded_files"
```

3. To check the contents of a table:
```bash
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -c "SELECT COUNT(*) FROM listings;"
```

4. To verify specific columns exist:
```bash
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listings';"
```

### Manually Executing Database Initialization Scripts

**Problem**: Need to manually initialize or reset the database.

**Solution**:
1. To completely reset the database (WARNING: This will delete all data):
```bash
docker compose down -v   # This removes volumes, including the database
docker compose up -d     # Start fresh
```

2. To manually execute scripts in order without losing data:
```bash
# First, connect to the database container
docker exec -it amazon-app-db-1 bash

# Once inside the container, run the scripts in order
psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/01-init.sql
psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/02-uploads-table.sql
psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/03-identifier-tracking.sql
psql -U postgres -d amazon_inventory -f /docker-entrypoint-initdb.d/04-duplicates-tables.sql
```

3. To run the automatic initialization and verification process:
```bash
docker exec -it amazon-app-db-1 bash /docker-entrypoint-initdb.d/00-wait-for-tables.sh
```

### Ensuring Database Tables Are Created During Container Startup

**Problem**: Tables are not being created properly during container startup.

**Solution**:
1. The application uses a dedicated `db-init` service that runs before other services and ensures all tables exist:
```yaml
# This is already configured in docker-compose.yml
db-init:
  image: postgres:14-alpine
  command: ["/bin/bash", "/docker-entrypoint-initdb.d/00-wait-for-tables.sh"]
  environment:
    - POSTGRES_PASSWORD=postgres
    - POSTGRES_USER=postgres
    - POSTGRES_DB=amazon_inventory
    - POSTGRES_HOST=db
  volumes:
    - ./db/init:/docker-entrypoint-initdb.d
  depends_on:
    db:
      condition: service_started
```

2. To troubleshoot container startup issues:
   - Check logs of the db-init container:
   ```bash
   docker logs amazon-app-db-init-1
   ```
   
   - Verify the initialization scripts exist in the correct location:
   ```bash
   docker exec -it amazon-app-db-1 ls -la /docker-entrypoint-initdb.d/
   ```
   
   - Check if scripts have execution permissions:
   ```bash
   docker exec -it amazon-app-db-1 chmod +x /docker-entrypoint-initdb.d/*.sh
   ```

3. If automatic initialization continues to fail, you can force a manual verification and initialization:
```bash
docker compose restart db-init
```

4. For the most persistent issues, try a clean rebuild:
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Using Flyway for Database Migrations

The application now supports Flyway for database migrations, providing a more robust way to manage schema changes:

1. Existing migration files are in `db/migrations/`
2. To run migrations:
```bash
docker-compose -f docker-compose.yml -f docker-compose.flyway.yml up flyway
```

3. To verify applied migrations:
```bash
docker exec -it amazon-app-db-1 psql -U postgres -d amazon_inventory -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank;"
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

### Database initialization issues

**Problem**: The database tables are not being created properly.

**Solution**:
1. Check the logs of the db-init container:
```bash
docker logs amazon-app-db-init-1
```

2. If initialization failed, force a recreation:
```bash
docker compose down -v
docker compose up -d
```

3. For persistent issues, use Flyway migrations:
```bash
docker-compose -f docker-compose.yml -f docker-compose.flyway.yml up flyway
```

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