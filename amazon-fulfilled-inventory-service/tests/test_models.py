import pytest
from pydantic import ValidationError

from app.models import (
    InventoryItem,
    InventoryStatistics,
    ReportRequest,
    InventoryRequest
)

def test_inventory_item_model():
    """Test the InventoryItem model validation"""
    # Test with valid data
    valid_data = {
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
    
    # Create a model instance
    item = InventoryItem(**valid_data)
    
    # Check that the data was set correctly
    assert item.sku == valid_data["sku"]
    assert item.asin == valid_data["asin"]
    assert item.fnsku == valid_data["fnsku"]
    assert item.product_name == valid_data["product_name"]
    assert item.condition == valid_data["condition"]
    assert item.quantity == valid_data["quantity"]
    assert item.fulfillable_quantity == valid_data["fulfillable_quantity"]
    assert item.unfulfillable_quantity == valid_data["unfulfillable_quantity"]
    assert item.reserved_quantity == valid_data["reserved_quantity"]
    assert item.inbound_working_quantity == valid_data["inbound_working_quantity"]
    assert item.inbound_shipped_quantity == valid_data["inbound_shipped_quantity"]
    assert item.inbound_receiving_quantity == valid_data["inbound_receiving_quantity"]
    
    # Test with missing required fields
    invalid_data = {
        "sku": "AM-1000-BK-4W-A1"
        # Missing other required fields
    }
    
    # Create a model instance with invalid data
    with pytest.raises(ValidationError):
        InventoryItem(**invalid_data)
    
    # Test with invalid data types
    invalid_types = {
        "sku": "AM-1000-BK-4W-A1",
        "asin": "B08ZJWN6ZS",
        "fnsku": "X00ABCD123",
        "product_name": "ATOM SKATES Outdoor Quad Roller Wheels",
        "condition": "New",
        "quantity": "not a number",  # Should be an integer
        "fulfillable_quantity": 95,
        "unfulfillable_quantity": 5,
        "reserved_quantity": 0,
        "inbound_working_quantity": 0,
        "inbound_shipped_quantity": 50,
        "inbound_receiving_quantity": 0
    }
    
    # Create a model instance with invalid types
    with pytest.raises(ValidationError):
        InventoryItem(**invalid_types)

def test_inventory_statistics_model():
    """Test the InventoryStatistics model validation"""
    # Test with valid data
    valid_data = {
        "total_skus": 100,
        "total_fulfillable": 950,
        "total_unfulfillable": 50,
        "total_reserved": 0,
        "total_quantity": 1000,
        "total_inbound_working": 0,
        "total_inbound_shipped": 500,
        "total_inbound_receiving": 0
    }
    
    # Create a model instance
    stats = InventoryStatistics(**valid_data)
    
    # Check that the data was set correctly
    assert stats.total_skus == valid_data["total_skus"]
    assert stats.total_fulfillable == valid_data["total_fulfillable"]
    assert stats.total_unfulfillable == valid_data["total_unfulfillable"]
    assert stats.total_reserved == valid_data["total_reserved"]
    assert stats.total_quantity == valid_data["total_quantity"]
    assert stats.total_inbound_working == valid_data["total_inbound_working"]
    assert stats.total_inbound_shipped == valid_data["total_inbound_shipped"]
    assert stats.total_inbound_receiving == valid_data["total_inbound_receiving"]
    
    # Test with invalid data types
    invalid_types = {
        "total_skus": "not a number",  # Should be an integer
        "total_fulfillable": 950,
        "total_unfulfillable": 50,
        "total_reserved": 0,
        "total_quantity": 1000,
        "total_inbound_working": 0,
        "total_inbound_shipped": 500,
        "total_inbound_receiving": 0
    }
    
    # Create a model instance with invalid types
    with pytest.raises(ValidationError):
        InventoryStatistics(**invalid_types)

def test_report_request_model():
    """Test the ReportRequest model validation"""
    # Test with valid data
    valid_data = {
        "report_path": "/path/to/report.csv"
    }
    
    # Create a model instance
    request = ReportRequest(**valid_data)
    
    # Check that the data was set correctly
    assert request.report_path == valid_data["report_path"]
    
    # Test with missing required fields
    invalid_data = {}
    
    # Create a model instance with invalid data
    with pytest.raises(ValidationError):
        ReportRequest(**invalid_data)

def test_inventory_request_model():
    """Test the InventoryRequest model validation"""
    # Test with valid data
    valid_data = {
        "skus": ["AM-1000-BK-4W-A1", "AM-1000-BL-4W-A3"]
    }
    
    # Create a model instance
    request = InventoryRequest(**valid_data)
    
    # Check that the data was set correctly
    assert request.skus == valid_data["skus"]
    
    # Test with empty list
    empty_list = {
        "skus": []
    }
    
    # Create a model instance with empty list
    request = InventoryRequest(**empty_list)
    assert request.skus == []
    
    # Test with invalid data types
    invalid_types = {
        "skus": "not a list"  # Should be a list
    }
    
    # Create a model instance with invalid types
    with pytest.raises(ValidationError):
        InventoryRequest(**invalid_types)
    
    # Test with invalid list items
    invalid_items = {
        "skus": [123, 456]  # Should be strings
    }
    
    # Create a model instance with invalid list items
    with pytest.raises(ValidationError):
        InventoryRequest(**invalid_items) 