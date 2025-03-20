#!/bin/bash

# This script builds Docker images with BuildKit optimizations enabled

# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Set inline cache
export BUILDKIT_INLINE_CACHE=1

# Build and tag images
echo "Building Docker images with BuildKit optimizations..."
docker compose build --parallel

echo "Docker images built successfully!"
echo "To run the application, use: docker compose up -d"