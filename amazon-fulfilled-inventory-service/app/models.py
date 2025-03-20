from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class InventoryItem(BaseModel):
    """Inventory item model"""
    sku: str
    asin: Optional[str] = None
    fnsku: Optional[str] = None
    product_name: Optional[str] = None
    condition: Optional[str] = None
    quantity: Optional[int] = None
    fulfillable_quantity: Optional[int] = None
    unfulfillable_quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    inbound_working_quantity: Optional[int] = None
    inbound_shipped_quantity: Optional[int] = None
    inbound_receiving_quantity: Optional[int] = None
    
class InventoryResponse(BaseModel):
    """Response model for inventory lookups"""
    sku: str
    asin: Optional[str] = None
    fnsku: Optional[str] = None
    product_name: Optional[str] = None
    condition: Optional[str] = None
    quantity: Optional[int] = None
    fulfillable_quantity: Optional[int] = None
    unfulfillable_quantity: Optional[int] = None
    reserved_quantity: Optional[int] = None
    inbound_working_quantity: Optional[int] = None
    inbound_shipped_quantity: Optional[int] = None
    inbound_receiving_quantity: Optional[int] = None

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
    """Database row model from inventory table"""
    sku: str = Field(..., alias="seller-sku")
    asin: Optional[str] = Field(None, alias="asin")
    fnsku: Optional[str] = Field(None, alias="fnsku")
    # Add other fields as needed

    class Config:
        allow_population_by_field_name = True 