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

1. **Frontend Service**: Next.js-based UI with React and TypeScript
   - Located in `app/components` and `app/[routes]`
   - Handles the presentation layer and user interactions
   - Server-side rendering for improved performance

2. **API Service**: Next.js API routes
   - Located in `app/api`
   - Handles data operations and communication with other services
   - RESTful endpoints for CRUD operations

3. **Database Service**: PostgreSQL database
   - Stores product data, duplicate issues, and identifier changes
   - Initialized with scripts in `db/init`
   - Schema migrations in `db/migrations`

4. **Worker Service**: Python-based background processing
   - Located in `workers/report-processor`
   - Processes uploaded files in the background
   - Detects duplicates and identifier changes

5. **Cache Service**: Redis for caching and job queues
   - Improves performance with caching
   - Manages background jobs
   - Tracks processing status

6. **Error Handling Service**: Centralized error handling
   - Provides consistent error handling and reporting
   - Error boundaries for React components

7. **Authentication Service**: Basic authentication support
   - Located in `lib/auth.ts`
   - Provides authentication options

## Key Features

- **Fully Editable Data Table**: All cells in the table are editable, allowing for easy data manipulation
- **Column Configuration**: Specialized columns for SKU, ASIN, FNSKU, EAN, UPC, and Quantity
- **File Upload Processing**: Comprehensive file upload system with validation and background processing
- **Duplicate SKU Resolution**: Interactive system for detecting, reviewing, and resolving duplicate SKUs
- **Identifier Change Tracking**: System for monitoring and acknowledging changes to product identifiers
- **Responsive Design**: Modern UI that works across different device sizes
- **Server-side Rendering**: Improved performance and SEO with Next.js server-side rendering
- **API Routes**: Built-in API endpoints for handling data operations

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

1. **Docker build TypeScript errors**:
   - Ensure all TypeScript types are properly defined
   - Use proper type guards for optional properties
   - Wrap Next.js client components using useSearchParams in Suspense boundaries

2. **Docker container issues**:
   - Check logs with `docker logs <container_id>`
   - Ensure all required services (PostgreSQL, Redis) are running
   - Verify network communication between services
   - Check environment variables in docker-compose.yml

3. **Database connection errors**:
   - Ensure PostgreSQL container is healthy
   - Check database initialization scripts
   - Verify database credentials in environment variables
   - Check database connection string format

4. **File upload processing issues**:
   - Verify worker service is running properly
   - Check Redis connection for job queues
   - Ensure upload directory permissions are correct
   - Check logs for specific processing errors

5. **Next.js development vs Docker differences**:
   - Some features might work in development but fail in production build
   - Always test the Docker build before deployment
   - Use Next.js build output to identify issues

6. **Puppeteer testing issues**:
   - Ensure the application is running before starting tests
   - Close and restart Puppeteer instances if they become unresponsive
   - Target correct URLs when testing Docker containers

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