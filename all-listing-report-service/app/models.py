from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

class ProductIdentifier(BaseModel):
    """Product identifier model (EAN or UPC)"""
    value: str
    type: str = Field(..., description="Identifier type: 'EAN' or 'UPC'")

class ProductResponse(BaseModel):
    """Response model for product lookups"""
    sku: str
    asin: Optional[str] = None
    product_id: Optional[ProductIdentifier] = None

class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str

class ReportProcessingResult(BaseModel):
    """Result of report processing"""
    processed_rows: int
    errors: List[Dict[str, Any]] = []
    status: str
    message: str

class DatabaseRow(BaseModel):
    """Database row model from listings table"""
    sku: str = Field(..., alias="seller-sku")
    asin: Optional[str] = Field(None, alias="asin1")
    product_id: Optional[str] = Field(None, alias="product-id")
    product_id_type: Optional[str] = Field(None, alias="product-id-type")
    # Add other fields as needed

    class Config:
        allow_population_by_field_name = True 