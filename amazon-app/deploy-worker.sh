#!/bin/bash

echo "Deploying fixed worker container..."

# Stop any existing worker container
echo "Stopping existing worker container if running..."
docker compose stop worker

# Rebuild the worker image without using cache
echo "Rebuilding worker image without cache..."
docker compose build --no-cache worker

# Start the worker service
echo "Starting worker service..."
docker compose up -d worker

echo "Worker deployment complete. Check logs with: docker compose logs -f worker" 