# Inventory Management System

A modern web application for managing Amazon inventory with file upload capabilities and a dynamic table interface using a microservices architecture.

## Features

- **All Listing Report**
  - Upload inventory files in various formats (.csv, .txt, .tsv, .xlsx)
  - Parsing and validation of uploaded files
  - Interactive table display of listing data
  - Database integration for persistent storage
  - Support for Amazon All Listings Report format
  - Real-time data processing and validation
  - Progress tracking for file uploads
  - Detailed error reporting and handling
  - Enhanced file format guidance with improved visual UI
- **Product List**
  - Interactive table with the following columns:
    - SKU (Stock Keeping Unit)
    - ASIN (Amazon Standard Identification Number)
    - FNSKU (Fulfillment Network Stock Keeping Unit)
    - EAN (European Article Number)
    - UPC (Universal Product Code)
    - Quantity (Numeric value for stock count)
  - Full editing capabilities for all cells
  - Sortable columns
  - Resizable rows and columns
  - Context menu for additional operations
- Modern, responsive design
- Redux state management for consistent data flow
- React Router for navigation between views
- Comprehensive error handling with ErrorBoundary
- Advanced logging system

## Technology Stack

- React 19.x
- TypeScript 4.x
- Redux Toolkit for state management
- React Router 7.x for navigation
- Handsontable for advanced table functionality
- Uppy for file uploading functionality
- Docker for containerization

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Docker (optional, for containerized deployment)

### Development Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd amazon-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Docker Setup

1. Build the Docker image:
```bash
docker build -t inventory-management .
```

2. Run the container:
```bash
docker run -p 3000:3000 inventory-management
```

3. Run with docker-compose:
```bash
docker-compose up
```

## Project Structure

```
amazon-app/
├── src/
│   ├── components/
│   │   ├── AllListingReport.tsx  # File upload and listing display
│   │   ├── FileUploader.tsx      # File upload component using Uppy
│   │   ├── InventoryTable.tsx    # Main table component for products
│   │   ├── ErrorBoundary.tsx     # Error handling component
│   │   └── NavLink.tsx           # Navigation component
│   ├── store/                    # Redux store configuration
│   │   ├── index.ts              # Store setup
│   │   ├── hooks.ts              # Custom Redux hooks
│   │   ├── middleware/           # Custom middleware
│   │   └── slices/               # Redux slices for state management
│   ├── services/                 # API services
│   ├── utils/                    # Utility functions
│   │   ├── errorHandler.ts       # Global error handling
│   │   └── logger.ts             # Logging functionality
│   ├── App.tsx                   # Main application component
│   ├── App.css                   # Application styles
│   └── index.tsx                 # Application entry point
├── public/
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Multi-container configuration
└── package.json                  # Project dependencies
```

## Component Documentation

### AllListingReport

The main component that handles file uploading and displays the listing data in an interactive table.

Features:
- File upload interface for listing reports
- Support for multiple file formats (.csv, .txt, .tsv, .xlsx)
- Parsing and validation of uploaded files
- Interactive table for viewing and editing listing data
- Error handling for file parsing and processing

### FileUploader

A reusable component for handling file uploads.

Props:
- `onUploadComplete`: Callback function that receives the upload response
- `onUploadError`: Callback function that handles upload errors

Features:
- File selection with input field
- Clear visual separation between filename and format guidance
- Enhanced format hint with information icon and highlighted styling
- Multi-stage upload process with visual indicators
- Progress tracking with status messages
- Error handling for upload failures
- Responsive design with appropriate spacing and visual hierarchy

### InventoryTable

Component that renders the interactive product data table.

Features:
- Column configuration for SKU, ASIN, FNSKU, EAN, UPC, and Quantity
- Fully editable cells for all columns
- Numeric input validation for Quantity field
- Row headers for easy reference
- Column headers with sorting capability
- Context menu for additional operations
- Automatic column width adjustment
- Manual column and row resizing

## Architecture Overview

This application follows a microservices architecture pattern with:

1. **Frontend Service**: React-based user interface with TypeScript for type safety
2. **State Management Service**: Redux for centralized state management
3. **Routing Service**: React Router for navigation between different views
4. **Data Visualization Service**: Handsontable for advanced table functionality
5. **File Upload Service**: Uppy for handling file uploads
6. **Error Handling Service**: Centralized error handling with custom error types
7. **Logging Service**: Comprehensive logging system with different log levels

Each service is isolated and communicates through well-defined interfaces, following the project development rules for maximal diversification and isolation.

## Logging System

The application includes a comprehensive logging system with the following features:

- **Log Levels**: DEBUG, INFO, WARN, ERROR levels with appropriate styling
- **Contextual Logging**: Each logger is created with a specific context
- **Environment-Based Configuration**: Different log levels for development and production
- **Redux Action Logging**: Middleware for tracking Redux actions and state changes
- **API Request/Response Logging**: Full logging of API interactions
- **Error Tracking**: Detailed error logs with stack traces when available

To enable specific log levels, set the `REACT_APP_LOG_LEVEL` environment variable:
- 0: DEBUG (most verbose, includes all logs)
- 1: INFO (medium verbosity, excludes DEBUG logs)
- 2: WARN (low verbosity, only WARN and ERROR logs)
- 3: ERROR (least verbose, only ERROR logs)

Example:
```
REACT_APP_LOG_LEVEL=1 npm start
```

## Error Handling

The application has a robust error handling system:

- **Error Boundaries**: Catch and display React component errors
- **API Error Handling**: Consistent handling of various API error types
- **Custom Error Types**: VALIDATION, API, NETWORK, etc.
- **Global Error Handlers**: Capture uncaught errors and promise rejections

## Testing

1. Unit Tests:
```bash
npm test
```

2. End-to-End Tests with Puppeteer:
```bash
npm run test:e2e
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License.
