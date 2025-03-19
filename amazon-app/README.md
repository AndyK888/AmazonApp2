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
- **Inventory Management**
  - Editable table for managing product inventory
  - Real-time updates as changes are made
  - Add new inventory items with a single click
  - View total item count at a glance
  - Simple, intuitive interface for all experience levels
  - Context menu for advanced operations
- **Duplicate SKU Resolution**
  - Detection of duplicate SKUs in uploaded files
  - Interactive interface for resolving duplicate entries
  - Options to keep, merge, or delete duplicate records
  - Comparison view of duplicate entries
  - Visual confirmation of resolution actions
- **Identifier Change Tracking**
  - Tracking changes to product identifiers (ASIN, EAN, UPC, etc.)
  - Notification of important identifier changes
  - Acknowledgment system for reviewed changes
  - Detailed history of changes per SKU
  - Filtering by acknowledgment status
- Modern, responsive design
- Redux state management for consistent data flow
- Next.js 15.x for server-side rendering and routing
- Comprehensive error handling with ErrorBoundary
- Advanced logging system

## Technology Stack

- Next.js 15.x
- React 19.x
- TypeScript 4.x
- PostgreSQL for data storage
- Redis for caching and background tasks
- Docker for containerization
- Python for background processing

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Docker (for containerized deployment)
- Python 3.11 (for background processing)

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
npm run dev
```

The application will be available at `http://localhost:3000`

### Docker Setup

1. Build and run the containers:
```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```

The application will be available at `http://localhost:3000`

## Project Structure

```
amazon-app/
├── app/
│   ├── api/                       # API routes
│   │   ├── duplicates/            # Duplicate SKU handling routes
│   │   └── listings/              # Listing data routes
│   ├── components/                # Shared React components
│   │   ├── DuplicateNotification.tsx  # Notification component for duplicates
│   │   ├── DuplicateResolution.tsx    # Resolution interface for duplicates
│   │   ├── FileUploader.tsx           # File upload component
│   │   ├── Navbar.tsx                 # Navigation component
│   │   └── ProcessingStatus.tsx       # Status tracking component
│   ├── duplicates/                # Duplicate resolution pages
│   ├── identifier-changes/        # Identifier change tracking pages
│   ├── layout.tsx                 # Root layout component
│   └── page.tsx                   # Home page component
├── db/                           # Database initialization and migrations
│   ├── init/                     # Database initialization scripts
│   └── migrations/               # Database migration scripts
├── lib/                          # Utility libraries
│   └── auth.ts                   # Authentication utilities
├── public/                       # Static assets
├── scripts/                      # Utility scripts
├── types/                        # TypeScript type definitions
├── workers/                      # Background processing workers
│   └── report-processor/         # File processing worker
├── Dockerfile                    # Frontend Docker configuration
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

### ProcessingStatus

Component for displaying the current status of file processing tasks.

Props:
- `fileId`: ID of the file being processed
- `onComplete`: Callback function when processing completes
- `onError`: Callback function when processing encounters an error

Features:
- Real-time status updates
- Progress indicators
- Error display with detailed messages
- Status message history
- Auto-refresh capability
- Completion notification

### DuplicateNotification

Component that notifies users of duplicate SKUs that need resolution.

Props:
- `count`: Number of duplicate SKUs detected
- `onResolveClick`: Callback function when the resolve button is clicked

Features:
- Prominent notification banner
- Clear messaging about duplicate issues
- Action button to navigate to resolution interface
- Dismissible display

### DuplicateResolution

Component for resolving duplicate SKU issues interactively.

Props:
- `issueId`: ID of the duplicate issue to resolve
- `onResolved`: Callback function when resolution is complete

Features:
- Loading state during data fetching
- Error handling for API failures
- Comparison table of duplicate entries
- Multiple resolution options (keep, merge, delete)
- Detailed view of all product attributes
- Confirmation step before applying changes
- Success and error state handling

### InventoryTable

Component that renders the interactive editable inventory table with Handsontable.

Features:
- Column configuration for Seller SKU, Quantity, ASIN, EAN, and UPC
- Fully editable cells for all columns
- Numeric input validation for Quantity field
- Row headers for easy reference
- Column headers with sorting capability
- Context menu for additional operations
- Add new item functionality
- Real-time data updates
- Loading states and error handling
- Responsive design with clean styling

## Architecture Overview

This application follows a microservices architecture pattern with:

1. **Frontend Service**: Next.js-based React application with TypeScript for type safety and server-side rendering
2. **API Service**: Server-side API routes built into Next.js for handling data requests and operations
3. **Database Service**: PostgreSQL database for persistent storage of inventory data
4. **Cache Service**: Redis for caching and background job management
5. **Worker Service**: Python-based background worker for processing uploaded files
6. **Error Handling Service**: Centralized error handling with custom error types
7. **Logging Service**: Comprehensive logging system with different log levels

This architecture is containerized using Docker, allowing for easy deployment and scaling. The services communicate through well-defined APIs, following the project development rules for maximal diversification and isolation.

### Messaging and Task Processing

The application uses a message-based architecture for processing background tasks:

1. **Message Format**: All tasks sent to the Celery worker must follow a specific format with required fields:
   - `id`: A unique identifier for the task
   - `task`: The name of the task to be executed (e.g., 'process_report')
   - `args`: Array of positional arguments for the task
   - `kwargs`: Object of keyword arguments for the task
   - `properties`: Task metadata including:
     - `delivery_mode`: Message persistence mode
     - `correlation_id`: For tracking the task
     - `delivery_tag`: Required by Kombu/Celery for message handling

2. **Available Tasks**:
   - `process_report`: Process standard inventory reports
   - `process_all_listings_report`: Process Amazon All Listings Reports
   - `resolve_duplicates`: Handle duplicate SKU resolution

3. **Message Queue**: Redis is used as the message broker to store and deliver tasks to workers.

For proper worker communication, every task message must include the `delivery_tag` property to avoid Celery worker crashes.

### Data Flow

1. **File Upload Process**:
   - User uploads a file through the FileUploader component
   - File is sent to the API Service for initial validation
   - Valid files are saved and queued for processing
   - Worker Service processes the file in the background
   - Processing status is tracked in Redis and can be monitored via the ProcessingStatus component

2. **Duplicate Resolution Process**:
   - System detects duplicate SKUs during file processing
   - User is notified through the DuplicateNotification component
   - User navigates to the duplicate resolution interface
   - User selects a resolution strategy for each duplicate
   - Selected actions are sent to the API Service
   - Database is updated according to the resolution strategy

3. **Identifier Change Tracking**:
   - System tracks changes to product identifiers
   - Changes are stored in the database with timestamps
   - User can view and acknowledge changes through the identifier changes interface
   - Acknowledgments are recorded in the database

Each process is isolated but communicated through well-defined interfaces, ensuring maintainability and scalability.

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
