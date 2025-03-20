import pytest
from fastapi.testclient import TestClient
import asyncio
from unittest.mock import patch, MagicMock

from app.main import app
from app.database import Database

# Create test client
client = TestClient(app)

# Mock database responses
mock_inventory = {
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

# Test data for batch lookup
mock_inventory_items = [
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
    },
    {
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
]

# Mock statistics
mock_stats = {
    "total_skus": 100,
    "total_fulfillable": 950,
    "total_unfulfillable": 50,
    "total_reserved": 0,
    "total_quantity": 1000,
    "total_inbound_working": 0,
    "total_inbound_shipped": 500,
    "total_inbound_receiving": 0
}

@pytest.fixture
def mock_db_pool():
    """Mock the database pool for testing"""
    # Create a mock database instance
    mock_db = MagicMock(spec=Database)
    
    # Mock the fetch_one method to return test data
    async def mock_fetch_one(query, *args):
        if "fba_inventory" in query and "stats" not in query and args[0] == "AM-1000-BK-4W-A1":
            return mock_inventory
        elif "stats" in query:
            return mock_stats
        return None
    
    # Mock the fetch_all method to return test data for batch lookup
    async def mock_fetch_all(query, *args):
        # Return products that match the requested SKUs
        return [p for p in mock_inventory_items if p["sku"] in args]
    
    # Assign the mocked methods
    mock_db.fetch_one.side_effect = mock_fetch_one
    mock_db.fetch_all.side_effect = mock_fetch_all
    
    # Return the mock
    return mock_db

# Override the get_db_pool dependency for testing
@pytest.fixture(autouse=True)
def override_get_db_pool(mock_db_pool):
    """Override the database dependency"""
    with patch("app.main.get_db_pool", return_value=mock_db_pool):
        yield

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()
    assert response.json()["status"] == "healthy"

def test_get_inventory_by_sku_found():
    """Test getting inventory by SKU when it exists"""
    response = client.get("/api/inventory/AM-1000-BK-4W-A1")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sku"] == "AM-1000-BK-4W-A1"
    assert data["asin"] == "B08ZJWN6ZS"
    assert data["fnsku"] == "X00ABCD123"
    assert data["product_name"] == "ATOM SKATES Outdoor Quad Roller Wheels"
    assert data["quantity"] == 100
    assert data["fulfillable_quantity"] == 95

def test_get_inventory_by_sku_not_found():
    """Test getting inventory by SKU when it doesn't exist"""
    response = client.get("/api/inventory/NOT-EXISTING-SKU")
    assert response.status_code == 404
    assert "detail" in response.json()

def test_batch_get_inventory():
    """Test batch lookup of inventory"""
    response = client.post(
        "/api/inventory/batch",
        json={"skus": ["AM-1000-BK-4W-A1", "AM-1000-BL-4W-A3"]}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    assert data["AM-1000-BK-4W-A1"]["sku"] == "AM-1000-BK-4W-A1"
    assert data["AM-1000-BK-4W-A1"]["asin"] == "B08ZJWN6ZS"
    assert data["AM-1000-BK-4W-A1"]["fulfillable_quantity"] == 95
    
    assert data["AM-1000-BL-4W-A3"]["sku"] == "AM-1000-BL-4W-A3"
    assert data["AM-1000-BL-4W-A3"]["asin"] == "B08ZJZHS5V"
    assert data["AM-1000-BL-4W-A3"]["fulfillable_quantity"] == 70

def test_batch_get_inventory_empty():
    """Test batch lookup with empty list"""
    response = client.post("/api/inventory/batch", json={"skus": []})
    assert response.status_code == 200
    assert response.json() == {}

def test_get_inventory_stats():
    """Test getting inventory statistics"""
    response = client.get("/api/inventory/stats")
    assert response.status_code == 200
    
    data = response.json()
    assert data["total_skus"] == 100
    assert data["total_fulfillable"] == 950
    assert data["total_unfulfillable"] == 50
    assert data["total_quantity"] == 1000 