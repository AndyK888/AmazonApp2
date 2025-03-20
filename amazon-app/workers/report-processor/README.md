# Report Processor Worker

This worker processes Amazon report files, particularly the "All Listings Report" format, and updates inventory data in the PostgreSQL database.

## Overview

The worker:
1. Monitors a Redis queue for processing tasks
2. Processes Amazon inventory report files (TSV format)
3. Updates the database with inventory information
4. Handles duplicate SKUs and other edge cases

## Key Files

- `standalone_worker.py` - The main worker implementation
- `Dockerfile` - Container configuration
- `requirements.txt` - Python dependencies

## Recent Fixes

- Fixed SQL query to properly handle hyphenated column names
  - Changed references from `seller_sku` to `"seller-sku"` (with quotes) to support PostgreSQL column names with hyphens
- Added container healthcheck
- Improved error handling and logging

## Deployment

The worker is integrated into the main docker-compose.yml file and can be deployed with:

```bash
# Deploy from project root
./deploy-worker.sh
```

## Troubleshooting

If the worker fails to process files:

1. Check Redis connectivity: `docker-compose logs redis`
2. Check database connectivity: `docker-compose logs db`
3. Check worker logs: `docker-compose logs worker`
4. Use the test_redis.py script to add a test task: `docker-compose exec worker python /app/test_redis.py` 