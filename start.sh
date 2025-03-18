#!/bin/bash

# Script to start the Inventory Management System application
echo "Starting Inventory Management System..."

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

# Start the application
echo "Starting development server..."
npm start 