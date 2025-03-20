# Amazon Inventory Management System

This is a full-stack application for managing Amazon inventory data including product listings and fulfillment information. The system is built using a microservices architecture with a Next.js frontend, PostgreSQL database, and specialized services for different inventory report types.

## System Architecture

The application consists of the following components:

1. **Frontend Service**: Next.js application that provides the UI for interacting with the system
2. **All Listings Report Service**: Microservice for processing and serving All Listings Report data
3. **Amazon Fulfilled Inventory Service**: Microservice for processing and serving Amazon Fulfilled Inventory data
4. **Database Service**: PostgreSQL database for storing inventory data
5. **Cache/Queue Service**: Redis instance used for caching and task queuing

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for development mode)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd AmazonApp2
   ```

2. Start the application:
   ```bash
   # Production mode (all services in Docker)
   ./start.sh
   
   # Development mode (frontend in dev mode, services in Docker)
   ./start.sh dev
   ```

### Configuration

The system uses environment variables for configuration. These are specified in the docker-compose.yml file and can be overridden by creating a .env file in the project root.

Key environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `ALL_LISTINGS_REPORT_SERVICE_URL`: URL of the All Listings Report microservice
- `AMAZON_FULFILLED_INVENTORY_API_URL`: URL of the Amazon Fulfilled Inventory microservice

## Using the Application

The application provides features for:

1. **Managing Inventory**:
   - View and filter product inventory
   - Upload and process inventory reports
   
2. **All Listings Report**:
   - Upload All Listings Report files (.txt or .csv)
   - View and filter listings
   - Track processing status

3. **Amazon Fulfilled Inventory**:
   - Upload Amazon Fulfilled Inventory reports
   - View and filter inventory data with fulfillable, unfulfillable, and reserved quantities
   - Track inventory statistics

## Microservice Integration

The application integrates multiple microservices:

1. **Next.js Frontend** serves the UI and proxies API requests to the appropriate microservice.
2. **All Listings Report Service** provides endpoints for uploading and retrieving listings data.
3. **Amazon Fulfilled Inventory Service** provides endpoints for uploading and retrieving fulfillment data.

All services share the same PostgreSQL database and Redis instance for data consistency.

## Development

To develop individual components:

1. **Frontend Development**:
   ```bash
   cd amazon-app
   npm install
   npm run dev
   ```

2. **Microservice Development**:
   ```bash
   # All Listings Report Service
   cd all-listing-report-service
   # Setup depends on the service's language/framework
   
   # Amazon Fulfilled Inventory Service
   cd amazon-fulfilled-inventory-service
   # Setup depends on the service's language/framework
   ```

## Troubleshooting

Common issues:

1. **Services not connecting**: Ensure all containers are running with `docker-compose ps`
2. **Database migration issues**: Check logs with `docker-compose logs db`
3. **Upload processing failures**: Check worker logs with `docker-compose logs worker`

For more details, see the individual README files in each service directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 