# Inventory Management System - Project Guide

## Project Overview

This project is a microservices-based inventory management system designed to provide a modern, responsive interface for handling inventory data. The application follows the principles outlined in the project development rules, with an emphasis on microservice architecture, isolation, and API-driven communication.

## Development Environment Setup

### Local Development

1. Clone the repository:
```bash
git clone [repository-url]
cd AmazonApp2
```

2. Use the start script to run the application:
```bash
./start.sh
```

This script will:
- Navigate to the amazon-app directory if needed
- Install dependencies if not already installed
- Start the development server

### Docker Development

To use Docker for development:

1. Navigate to the amazon-app directory:
```bash
cd amazon-app
```

2. Start the containers with docker-compose:
```bash
docker-compose up
```

3. For production builds:
```bash
docker build -t inventory-management .
docker run -p 3000:3000 inventory-management
```

## Application Structure

The application follows a microservices architecture pattern:

1. **Frontend Service**: React-based UI with TypeScript
   - Located in `src/components`
   - Handles the presentation layer and user interactions

2. **State Management Service**: Redux for centralized state management
   - Located in `src/store`
   - Manages application state and data flow

3. **Routing Service**: React Router for navigation
   - Handles navigation between different views
   - Defines the application's route structure

4. **Data Visualization Service**: Handsontable integration
   - Provides the interactive table functionality
   - Manages data display and editing capabilities

5. **Logging Service**: Comprehensive logging system
   - Located in `src/utils/logger.ts`
   - Handles application-wide logging with different levels

6. **Error Handling Service**: Centralized error handling
   - Located in `src/utils/errorHandler.ts` and `src/components/ErrorBoundary.tsx`
   - Provides consistent error handling and reporting

7. **API Service**: Centralized API communication
   - Located in `src/services/api.ts`
   - Handles all HTTP requests with proper error handling and logging

## Key Features

- **Fully Editable Data Table**: All cells in the table are editable, allowing for easy data manipulation
- **Column Configuration**: Specialized columns for SKU, ASIN, FNSKU, EAN, UPC, and Quantity
- **Responsive Design**: Modern UI that works across different device sizes
- **State Management**: Consistent data flow with Redux
- **Navigation**: Seamless navigation between views with React Router

## Development Workflow

1. **Design Phase**:
   - Identify the functionality to be implemented
   - Define the API endpoints and data structures
   - Plan the UI components and user interactions

2. **Implementation Phase**:
   - Develop the required components and services
   - Integrate with the existing codebase
   - Containerize the application for deployment

3. **Testing Phase**:
   - Unit testing with Jest
   - UI testing with Puppeteer
   - End-to-end testing of the full application flow

## Troubleshooting

### Common Issues

1. **npm start fails at the root directory**:
   - Use the provided `start.sh` script which automatically navigates to the correct directory
   - Or manually `cd amazon-app` before running npm commands

2. **Docker container issues**:
   - Check logs with `docker logs <container_id>`
   - Ensure ports are not already in use
   - Verify the Dockerfile and docker-compose.yml are correctly configured

3. **Puppeteer testing issues**:
   - Ensure the application is running before starting tests
   - Close and restart Puppeteer instances if they become unresponsive

## Maintenance and Updates

1. When adding new features:
   - Follow the microservices philosophy - keep services isolated
   - Update documentation to reflect changes
   - Add appropriate tests

2. For dependency updates:
   - Test thoroughly after updates
   - Update Docker configurations if needed
   - Document any breaking changes

## Logging System

### Overview

The application includes a comprehensive logging system that provides different log levels and consistent formatting across all components.

### Key Features

- **Log Levels**: DEBUG, INFO, WARN, ERROR with appropriate styling
- **Context-Based Logging**: Each logger is created with a specific context
- **Environment Configuration**: Different log levels for development and production
- **Redux Action Logging**: Middleware for tracking Redux actions and state changes

### Usage

To create a logger for a specific component or service:

```typescript
import { createLogger } from '../utils/logger';

const logger = createLogger('ComponentName');

// Usage examples
logger.debug('Debug message', { additionalData });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Configuration

Log levels can be configured by setting the `REACT_APP_LOG_LEVEL` environment variable:

- 0: DEBUG (most verbose)
- 1: INFO (medium verbosity)
- 2: WARN (less verbose)
- 3: ERROR (least verbose)

## Error Handling System

### Overview

The application includes a robust error handling system that provides consistent error handling across all components and services.

### Key Components

1. **Error Boundaries**: React components that catch errors in their child component tree
2. **Custom Error Types**: Structured error types for different scenarios
3. **API Error Handling**: Specialized handling for network and API errors
4. **Global Error Handlers**: Capture uncaught errors and unhandled promise rejections

### Usage

#### Error Boundaries

```tsx
import ErrorBoundary from '../components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

#### Custom Error Handling

```typescript
import { AppError, ErrorType, handleApiError } from '../utils/errorHandler';

try {
  // Some code that might throw an error
} catch (error) {
  // Convert to AppError for consistent handling
  const appError = handleApiError(error);
  
  // Handle different error types
  if (appError.type === ErrorType.VALIDATION) {
    // Handle validation error
  } else if (appError.type === ErrorType.NETWORK) {
    // Handle network error
  }
}
``` 