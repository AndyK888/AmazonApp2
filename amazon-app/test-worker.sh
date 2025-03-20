#!/bin/bash

echo "Testing worker functionality..."

# Check if the worker container is running
if ! docker-compose ps | grep -q "worker.*Up"; then
  echo "Worker container is not running! Starting it..."
  docker-compose up -d worker
  # Wait for the container to start
  sleep 10
fi

# Copy the test script to the worker container
echo "Copying test_redis.py to worker container..."
docker-compose cp test_redis.py worker:/app/

# Execute the test script in the worker container
echo "Adding test task to Redis queue..."
docker-compose exec worker python /app/test_redis.py

echo "Test task added. Monitor logs with: docker-compose logs -f worker" 