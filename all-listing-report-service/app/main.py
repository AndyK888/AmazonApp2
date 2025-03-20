from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

from app.database import get_db_pool, close_db_pool, Database
from app.models import ProductResponse, ProductIdentifier, ErrorResponse
from app.config import settings
from app.processor import ReportProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("all-listing-report-service")

# Create FastAPI app
app = FastAPI(
    title="All Listing Report API",
    description="API for accessing Amazon All Listing Report data",
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

# Product lookup by SKU endpoint
@app.get(
    "/api/products/{sku}",
    response_model=ProductResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_product_by_sku(
    sku: str,
    include_asin: bool = Query(True, description="Include ASIN in the response"),
    include_product_id: bool = Query(True, description="Include product ID (EAN/UPC) in the response"),
    db: Database = Depends(get_db_pool),
):
    """
    Get product identifiers by SKU
    
    - **sku**: The seller SKU to look up
    - **include_asin**: Whether to include ASIN in the response
    - **include_product_id**: Whether to include product ID (EAN/UPC) in the response
    """
    logger.info(f"Looking up product with SKU: {sku}")
    
    # Query the database for the product information
    query = """
        SELECT 
            "seller-sku" as sku,
            "asin1" as asin,
            "product-id" as product_id,
            "product-id-type" as product_id_type
        FROM 
            listings
        WHERE 
            "seller-sku" = $1
        LIMIT 1
    """
    
    result = await db.fetch_one(query, sku)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Product with SKU {sku} not found")
    
    # Build the response based on query parameters
    response = {"sku": result["sku"]}
    
    if include_asin and result["asin"]:
        response["asin"] = result["asin"]
    
    if include_product_id and result["product_id"]:
        product_id_type = result["product_id_type"]
        # Determine if the product ID is an EAN or UPC
        id_type = None
        if product_id_type == "2":  # 2 is for EAN
            id_type = "EAN"
        elif product_id_type == "3":  # 3 is for UPC
            id_type = "UPC"
        
        if id_type:
            response["product_id"] = ProductIdentifier(
                value=result["product_id"],
                type=id_type
            )
    
    return response

# Batch lookup endpoint
@app.post(
    "/api/products/batch",
    response_model=Dict[str, ProductResponse],
    responses={404: {"model": ErrorResponse}},
)
async def batch_get_products(
    skus: List[str],
    include_asin: bool = Query(True, description="Include ASIN in the response"),
    include_product_id: bool = Query(True, description="Include product ID (EAN/UPC) in the response"),
    db: Database = Depends(get_db_pool),
):
    """
    Get product identifiers for multiple SKUs in a single request
    
    - **skus**: List of seller SKUs to look up
    - **include_asin**: Whether to include ASIN in the response
    - **include_product_id**: Whether to include product ID (EAN/UPC) in the response
    """
    if not skus:
        return {}
    
    logger.info(f"Batch lookup for {len(skus)} SKUs")
    
    # Query the database for the product information
    placeholders = ", ".join(f"${i+1}" for i in range(len(skus)))
    query = f"""
        SELECT 
            "seller-sku" as sku,
            "asin1" as asin,
            "product-id" as product_id,
            "product-id-type" as product_id_type
        FROM 
            listings
        WHERE 
            "seller-sku" IN ({placeholders})
    """
    
    results = await db.fetch_all(query, *skus)
    
    # Build the response dictionary
    response = {}
    for row in results:
        product_response = {"sku": row["sku"]}
        
        if include_asin and row["asin"]:
            product_response["asin"] = row["asin"]
        
        if include_product_id and row["product_id"]:
            product_id_type = row["product_id_type"]
            # Determine if the product ID is an EAN or UPC
            id_type = None
            if product_id_type == "2":  # 2 is for EAN
                id_type = "EAN"
            elif product_id_type == "3":  # 3 is for UPC
                id_type = "UPC"
            
            if id_type:
                product_response["product_id"] = ProductIdentifier(
                    value=row["product_id"],
                    type=id_type
                )
        
        response[row["sku"]] = product_response
    
    return response

# Upload new report endpoint
@app.post("/api/reports/upload")
async def upload_report(
    file_path: str,
    db: Database = Depends(get_db_pool),
):
    """
    Process a new All Listing Report file
    
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