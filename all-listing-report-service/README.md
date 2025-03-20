# All Listing Report Service

A microservice for processing Amazon All Listing Reports and providing an API to access product identifiers.

## Overview

This microservice processes Amazon All Listing Report files and provides a REST API to query product information by SKU. The service is designed to be isolated, containerized, and easy to deploy using Docker.

### Features

- **Isolated Microservice**: Runs independently with its own database and API
- **Report Processing**: Processes Amazon All Listing Report files and stores data in a database
- **RESTful API**: Provides endpoints to query product information by SKU
- **Batch Processing**: Handles large report files by processing in chunks
- **Duplicate Detection**: Identifies duplicate SKUs in reports

## API Endpoints

The service provides the following API endpoints:

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/health` | Health check endpoint to verify service is running |
| GET | `/api/products/{sku}` | Get product identifiers by SKU |
| POST | `/api/products/batch` | Batch lookup of product identifiers |
| POST | `/api/reports/upload` | Process a new All Listing Report file |

### Product Lookup Endpoint

`GET /api/products/{sku}`

Retrieve product identifiers by SKU.

#### Parameters:

- `sku` (path parameter) - The seller SKU to look up
- `include_asin` (query parameter, default: true) - Whether to include ASIN in the response
- `include_product_id` (query parameter, default: true) - Whether to include product ID (EAN/UPC) in the response

#### Example Response:

```json
{
  "sku": "AM-1000-BK-4W-A1",
  "asin": "B08ZJWN6ZS",
  "product_id": {
    "value": "0123456789012",
    "type": "EAN"
  }
}
```

### Batch Lookup Endpoint

`POST /api/products/batch`

Get product identifiers for multiple SKUs in a single request.

#### Request Body:

```json
{
  "skus": ["AM-1000-BK-4W-A1", "AM-1000-BL-4W-A3"]
}
```

#### Query Parameters:

- `include_asin` (query parameter, default: true) - Whether to include ASIN in the response
- `include_product_id` (query parameter, default: true) - Whether to include product ID (EAN/UPC) in the response

#### Example Response:

```json
{
  "AM-1000-BK-4W-A1": {
    "sku": "AM-1000-BK-4W-A1",
    "asin": "B08ZJWN6ZS",
    "product_id": {
      "value": "0123456789012",
      "type": "EAN"
    }
  },
  "AM-1000-BL-4W-A3": {
    "sku": "AM-1000-BL-4W-A3",
    "asin": "B08ZJZHS5V",
    "product_id": {
      "value": "1234567890123",
      "type": "EAN"
    }
  }
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

#### `listings` Table

Stores product information from the All Listing Report:

- `id` - Primary key
- `seller-sku` - Seller SKU (required)
- `asin1` - Amazon Standard Identification Number
- `product-id` - Product ID (EAN or UPC)
- `product-id-type` - Type of Product ID (2 for EAN, 3 for UPC)
- And other fields from the All Listing Report

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
2. Navigate to the `all-listing-report-service` directory
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
2. Navigate to the `all-listing-report-service` directory
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
3. Replace direct database queries for product information with API calls to this service

### Example API Call from Main Application

```javascript
async function getProductBySkU(sku) {
  const response = await fetch(`http://all-listing-service:5000/api/products/${sku}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }
  return await response.json();
}
```

## Testing

The service includes unit and integration tests. To run the tests:

```bash
pytest
```

## License

This project is proprietary and confidential. 