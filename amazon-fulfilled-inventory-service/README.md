# Amazon-fulfilled Inventory Service

A microservice for processing Amazon-fulfilled Inventory Reports and providing an API to access inventory data.

## Overview

This microservice processes Amazon-fulfilled Inventory report files (TSV format with .txt extension) and provides a REST API to query inventory information by SKU. The service is designed to be isolated, containerized, and easy to deploy using Docker.

### Features

- **Isolated Microservice**: Runs independently with its own database and API
- **Report Processing**: Processes Amazon-fulfilled Inventory Report files and stores data in a database
- **RESTful API**: Provides endpoints to query inventory information by SKU
- **Batch Processing**: Handles large report files by processing in chunks
- **Duplicate Detection**: Identifies duplicate SKUs in reports
- **Inventory Statistics**: Provides aggregated inventory statistics

## API Endpoints

The service provides the following API endpoints:

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/health` | Health check endpoint to verify service is running |
| GET | `/api/inventory/{sku}` | Get inventory information by SKU |
| POST | `/api/inventory/batch` | Batch lookup of inventory information |
| GET | `/api/inventory/stats` | Get aggregated inventory statistics |
| POST | `/api/reports/upload` | Process a new Amazon-fulfilled Inventory report file |

### Inventory Lookup Endpoint

`GET /api/inventory/{sku}`

Retrieve inventory information by SKU.

#### Parameters:

- `sku` (path parameter) - The seller SKU to look up

#### Example Response:

```json
{
  "sku": "AM-1000-BK-4W-A1",
  "asin": "B08ZJWN6ZS",
  "fnsku": "X00ABCD123",
  "product_name": "ATOM SKATES Outdoor Quad Roller Wheels",
  "condition": "New",
  "quantity": 100,
  "fulfillable_quantity": 95,
  "unfulfillable_quantity": 5,
  "reserved_quantity": 0,
  "inbound_working_quantity": 0,
  "inbound_shipped_quantity": 50,
  "inbound_receiving_quantity": 0
}
```

### Batch Lookup Endpoint

`POST /api/inventory/batch`

Get inventory information for multiple SKUs in a single request.

#### Request Body:

```json
{
  "skus": ["AM-1000-BK-4W-A1", "AM-1000-BL-4W-A3"]
}
```

#### Example Response:

```json
{
  "AM-1000-BK-4W-A1": {
    "sku": "AM-1000-BK-4W-A1",
    "asin": "B08ZJWN6ZS",
    "fnsku": "X00ABCD123",
    "product_name": "ATOM SKATES Outdoor Quad Roller Wheels",
    "condition": "New",
    "quantity": 100,
    "fulfillable_quantity": 95,
    "unfulfillable_quantity": 5,
    "reserved_quantity": 0,
    "inbound_working_quantity": 0,
    "inbound_shipped_quantity": 50,
    "inbound_receiving_quantity": 0
  },
  "AM-1000-BL-4W-A3": {
    "sku": "AM-1000-BL-4W-A3",
    "asin": "B08ZJZHS5V",
    "fnsku": "X00EFGH456",
    "product_name": "ATOM SKATES Outdoor Quad Roller Wheels Blue",
    "condition": "New",
    "quantity": 75,
    "fulfillable_quantity": 70,
    "unfulfillable_quantity": 5,
    "reserved_quantity": 0,
    "inbound_working_quantity": 0,
    "inbound_shipped_quantity": 25,
    "inbound_receiving_quantity": 0
  }
}
```

### Inventory Statistics Endpoint

`GET /api/inventory/stats`

Get overall inventory statistics.

#### Example Response:

```json
{
  "total_skus": 100,
  "total_fulfillable": 950,
  "total_unfulfillable": 50,
  "total_reserved": 0,
  "total_quantity": 1000,
  "total_inbound_working": 0,
  "total_inbound_shipped": 500,
  "total_inbound_receiving": 0
}
```

## Architecture

This microservice is built on a clean architecture with the following components:

1. **FastAPI Application**: Handles HTTP requests and responses
2. **Database Layer**: Manages database connections and queries
3. **Report Processor**: Handles the processing of report files
4. **Configuration**: Manages application settings

### Database Schema

The service uses two main tables:

#### `fba_inventory` Table

Stores inventory information from the Amazon-fulfilled Inventory Report:

- `id` - Primary key
- `seller-sku` - Seller SKU (required)
- `asin` - Amazon Standard Identification Number
- `fnsku` - Fulfillment Network SKU
- `product-name` - Product name
- `condition` - Product condition
- `afn-fulfillable-quantity` - Fulfillable quantity
- `afn-unsellable-quantity` - Unfulfillable quantity
- `afn-reserved-quantity` - Reserved quantity
- `afn-total-quantity` - Total quantity
- And other inventory-related fields

#### `uploaded_files` Table

Tracks uploaded report files and their processing status:

- `id` - UUID for the file
- `original_name` - Original filename
- `file_path` - Path to the file on disk
- `status` - Processing status ('pending', 'processing', 'completed', 'error')
- `processed_rows` - Number of rows processed
- `total_rows` - Total number of rows in the file
- And other metadata fields

## Setup and Deployment

### Prerequisites

- Docker
- Docker Compose

### Configuration

The service can be configured using environment variables:

| Variable | Description | Default |
| -------- | ----------- | ------- |
| APP_DATABASE_HOST | Database host | postgres |
| APP_DATABASE_PORT | Database port | 5432 |
| APP_DATABASE_USER | Database user | postgres |
| APP_DATABASE_PASSWORD | Database password | postgres |
| APP_DATABASE_NAME | Database name | amazon_inventory |
| APP_DATABASE_MIN_CONNECTIONS | Minimum database connections | 5 |
| APP_DATABASE_MAX_CONNECTIONS | Maximum database connections | 20 |
| APP_MAX_REPORT_SIZE_MB | Maximum report file size in MB | 100 |
| APP_REPORT_CHUNK_SIZE | Number of rows to process in a chunk | 1000 |
| APP_UPLOAD_FOLDER | Folder for uploaded reports | /app/uploads |

### Running with Docker Compose

1. Clone the repository
2. Navigate to the `amazon-fulfilled-inventory-service` directory
3. Create an `uploads` directory:
   ```bash
   mkdir -p uploads
   ```
4. Start the service:
   ```bash
   docker-compose up -d
   ```
5. The API will be available at `http://localhost:5000`

### Running Locally for Development

1. Clone the repository
2. Navigate to the `amazon-fulfilled-inventory-service` directory
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in a `.env` file
5. Run the service:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation

When the service is running, API documentation is available at:

- Swagger UI: `http://localhost:5000/docs`
- ReDoc: `http://localhost:5000/redoc`

## Integration with Main Application

To integrate with the main application:

1. Deploy this microservice as a separate container
2. Configure the main application to communicate with this service's API
3. Replace direct database queries for inventory information with API calls to this service

### Example API Call from Main Application

```javascript
async function getInventoryBySku(sku) {
  const response = await fetch(`http://fba-inventory-service:5000/api/inventory/${sku}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch inventory: ${response.statusText}`);
  }
  return await response.json();
}
```

## Processing Amazon-fulfilled Inventory Reports

The service processes Amazon-fulfilled Inventory reports with the following steps:

1. Read the TSV file (.txt extension)
2. Normalize column names
3. Process in chunks to avoid memory issues with large files
4. Update existing inventory items or insert new ones
5. Track processing status and provide detailed logs

### Expected Report Format

The service expects Amazon-fulfilled Inventory reports in TSV format with a .txt extension. The report should contain columns such as:

- seller-sku
- asin
- fnsku
- product-name
- condition
- afn-warehouse-quantity
- afn-fulfillable-quantity
- afn-unsellable-quantity
- afn-reserved-quantity
- afn-total-quantity
- afn-inbound-working-quantity
- afn-inbound-shipped-quantity
- afn-inbound-receiving-quantity

## License

This project is proprietary and confidential. 