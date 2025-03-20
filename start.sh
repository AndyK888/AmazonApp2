#!/bin/bash

# Script to start the entire Amazon Inventory Management System
echo "Starting Amazon Inventory Management System..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml file not found."
  exit 1
fi

# Check if we are in development mode
if [ "$1" == "dev" ]; then
  echo "Starting in development mode..."
  
  # Check if we're in the root directory and navigate to amazon-app if needed
  if [ -d "amazon-app" ]; then
    cd amazon-app
    echo "Changed to amazon-app directory"
  fi

  # Check if node_modules exists, if not run npm install
  if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
  fi

  # Start the frontend in development mode
  echo "Starting frontend development server..."
  npm run dev &
  FRONTEND_PID=$!
  
  # Start the microservices using Docker Compose
  cd ..
  echo "Starting microservices using Docker Compose..."
  docker-compose up -d redis db all-listing-report-service amazon-fulfilled-inventory-service
  
  # Wait for the user to press Ctrl+C
  echo "Press Ctrl+C to stop all services"
  wait $FRONTEND_PID
  
  # When Ctrl+C is pressed, stop the Docker services
  echo "Stopping microservices..."
  docker-compose down
else
  # Production mode - use Docker Compose for everything
  echo "Starting all services using Docker Compose..."
  docker-compose up -d
  
  echo "All services started. View logs with: docker-compose logs -f"
  echo "Stop services with: docker-compose down"
fi

exit 0 