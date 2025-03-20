from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

from app.database import get_db_pool, close_db_pool, Database
from app.models import InventoryResponse, ErrorResponse
from app.config import settings
from app.processor import ReportProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("amazon-fulfilled-inventory-service")

# Create FastAPI app
app = FastAPI(
    title="Amazon-fulfilled Inventory API",
    description="API for accessing Amazon-fulfilled Inventory data",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    """Initialize database connection pool on startup"""
    await get_db_pool()
    logger.info("Application started, database connection pool initialized")

@app.on_event("shutdown")
async def shutdown():
    """Close database connection pool on shutdown"""
    await close_db_pool()
    logger.info("Application shutting down, database connections closed")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint to verify service is running"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Inventory lookup by SKU endpoint
@app.get(
    "/api/inventory/{sku}",
    response_model=InventoryResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_inventory_by_sku(
    sku: str,
    db: Database = Depends(get_db_pool),
):
    """
    Get inventory information by SKU
    
    - **sku**: The seller SKU to look up
    """
    logger.info(f"Looking up inventory with SKU: {sku}")
    
    # Query the database for the inventory information
    query = """
        SELECT 
            "seller-sku" as sku,
            "asin" as asin,
            "fnsku" as fnsku,
            "product-name" as product_name,
            "condition" as condition,
            "afn-fulfillable-quantity" as fulfillable_quantity,
            "afn-unsellable-quantity" as unfulfillable_quantity,
            "afn-reserved-quantity" as reserved_quantity,
            "afn-total-quantity" as quantity,
            "afn-inbound-working-quantity" as inbound_working_quantity,
            "afn-inbound-shipped-quantity" as inbound_shipped_quantity,
            "afn-inbound-receiving-quantity" as inbound_receiving_quantity
        FROM 
            fba_inventory
        WHERE 
            "seller-sku" = $1
        ORDER BY
            updated_at DESC
        LIMIT 1
    """
    
    result = await db.fetch_one(query, sku)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Inventory with SKU {sku} not found")
    
    # Return the inventory information
    return result

# Batch inventory lookup endpoint
@app.post(
    "/api/inventory/batch",
    response_model=Dict[str, InventoryResponse],
    responses={404: {"model": ErrorResponse}},
)
async def batch_get_inventory(
    skus: List[str],
    db: Database = Depends(get_db_pool),
):
    """
    Get inventory information for multiple SKUs in a single request
    
    - **skus**: List of seller SKUs to look up
    """
    if not skus:
        return {}
    
    logger.info(f"Batch lookup for {len(skus)} SKUs")
    
    # Query the database for the inventory information
    placeholders = ", ".join(f"${i+1}" for i in range(len(skus)))
    query = f"""
        WITH latest_inventory AS (
            SELECT DISTINCT ON ("seller-sku")
                "seller-sku",
                "asin",
                "fnsku",
                "product-name",
                "condition",
                "afn-fulfillable-quantity",
                "afn-unsellable-quantity",
                "afn-reserved-quantity",
                "afn-total-quantity",
                "afn-inbound-working-quantity",
                "afn-inbound-shipped-quantity",
                "afn-inbound-receiving-quantity"
            FROM 
                fba_inventory
            WHERE 
                "seller-sku" IN ({placeholders})
            ORDER BY
                "seller-sku", updated_at DESC
        )
        SELECT 
            "seller-sku" as sku,
            "asin" as asin,
            "fnsku" as fnsku,
            "product-name" as product_name,
            "condition" as condition,
            "afn-fulfillable-quantity" as fulfillable_quantity,
            "afn-unsellable-quantity" as unfulfillable_quantity,
            "afn-reserved-quantity" as reserved_quantity,
            "afn-total-quantity" as quantity,
            "afn-inbound-working-quantity" as inbound_working_quantity,
            "afn-inbound-shipped-quantity" as inbound_shipped_quantity,
            "afn-inbound-receiving-quantity" as inbound_receiving_quantity
        FROM 
            latest_inventory
    """
    
    results = await db.fetch_all(query, *skus)
    
    # Build the response dictionary
    response = {}
    for row in results:
        response[row["sku"]] = row
    
    return response

# Upload new report endpoint
@app.post("/api/reports/upload")
async def upload_report(
    file_path: str,
    db: Database = Depends(get_db_pool),
):
    """
    Process a new Amazon-fulfilled Inventory report file
    
    - **file_path**: Path to the report file
    """
    try:
        # Create and use the report processor
        processor = ReportProcessor(db=db)
        result = await processor.process_report(file_path)
        return result
    except Exception as e:
        logger.error(f"Error processing report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process report: {str(e)}")

# Get inventory statistics endpoint
@app.get("/api/inventory/stats")
async def get_inventory_stats(
    db: Database = Depends(get_db_pool),
):
    """
    Get overall inventory statistics
    """
    logger.info("Fetching inventory statistics")
    
    query = """
        WITH latest_inventory AS (
            SELECT DISTINCT ON ("seller-sku")
                "seller-sku",
                "afn-fulfillable-quantity",
                "afn-unsellable-quantity",
                "afn-reserved-quantity",
                "afn-total-quantity",
                "afn-inbound-working-quantity",
                "afn-inbound-shipped-quantity",
                "afn-inbound-receiving-quantity"
            FROM 
                fba_inventory
            ORDER BY
                "seller-sku", updated_at DESC
        )
        SELECT 
            COUNT(DISTINCT "seller-sku") as total_skus,
            SUM("afn-fulfillable-quantity") as total_fulfillable,
            SUM("afn-unsellable-quantity") as total_unfulfillable,
            SUM("afn-reserved-quantity") as total_reserved,
            SUM("afn-total-quantity") as total_quantity,
            SUM("afn-inbound-working-quantity") as total_inbound_working,
            SUM("afn-inbound-shipped-quantity") as total_inbound_shipped,
            SUM("afn-inbound-receiving-quantity") as total_inbound_receiving
        FROM 
            latest_inventory
    """
    
    result = await db.fetch_one(query)
    
    if not result:
        return {
            "total_skus": 0,
            "total_fulfillable": 0,
            "total_unfulfillable": 0,
            "total_reserved": 0,
            "total_quantity": 0,
            "total_inbound_working": 0,
            "total_inbound_shipped": 0,
            "total_inbound_receiving": 0
        }
    
    return result 