#!/bin/bash

# Script to fix the worker issues inside the Docker container

echo "Fixing worker container issues..."

# First, get the existing worker code
docker exec amazon-app-worker-1 cat /app/standalone_worker.py > fixes/standalone_worker.py.bak

# Create a fixed version with sed
cat fixes/standalone_worker.py.bak | \
  # Fix the asin column reference
  sed 's/"SELECT id, asin, upc, ean FROM listings WHERE seller_sku = %s"/"SELECT id, asin1 as asin, product_id as upc, product_id as ean FROM listings WHERE seller_sku = %s"/g' | \
  # Fix the processing_details column
  sed 's/processing_details/process_status_details/g' > fixes/standalone_worker.py.fixed

# Copy the fixed file to the worker container
docker cp fixes/standalone_worker.py.fixed amazon-app-worker-1:/app/standalone_worker.py

# Restart the worker container
docker restart amazon-app-worker-1

echo "Worker container fixed and restarted!" 