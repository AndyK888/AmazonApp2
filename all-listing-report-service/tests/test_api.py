import pytest
from fastapi.testclient import TestClient
import asyncio
from unittest.mock import patch, MagicMock

from app.main import app
from app.database import Database

# Create test client
client = TestClient(app)

# Mock database responses
mock_product = {
    "sku": "AM-1000-BK-4W-A1",
    "asin": "B08ZJWN6ZS",
    "product_id": "0123456789012",
    "product_id_type": "2"  # EAN
}

# Test data for batch lookup
mock_products = [
    {
        "sku": "AM-1000-BK-4W-A1",
        "asin": "B08ZJWN6ZS",
        "product_id": "0123456789012",
        "product_id_type": "2"  # EAN
    },
    {
        "sku": "AM-1000-BL-4W-A3",
        "asin": "B08ZJZHS5V",
        "product_id": "1234567890123",
        "product_id_type": "3"  # UPC
    }
]

@pytest.fixture
def mock_db_pool():
    """Mock the database pool for testing"""
    # Create a mock database instance
    mock_db = MagicMock(spec=Database)
    
    # Mock the fetch_one method to return test data
    async def mock_fetch_one(query, *args):
        if args[0] == "AM-1000-BK-4W-A1":
            return mock_product
        return None
    
    # Mock the fetch_all method to return test data for batch lookup
    async def mock_fetch_all(query, *args):
        # Return products that match the requested SKUs
        return [p for p in mock_products if p["sku"] in args]
    
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

def test_get_product_by_sku_found():
    """Test getting a product by SKU when it exists"""
    response = client.get("/api/products/AM-1000-BK-4W-A1")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sku"] == "AM-1000-BK-4W-A1"
    assert data["asin"] == "B08ZJWN6ZS"
    assert data["product_id"]["value"] == "0123456789012"
    assert data["product_id"]["type"] == "EAN"

def test_get_product_by_sku_not_found():
    """Test getting a product by SKU when it doesn't exist"""
    response = client.get("/api/products/NOT-EXISTING-SKU")
    assert response.status_code == 404
    assert "detail" in response.json()

def test_get_product_without_asin():
    """Test getting a product without including ASIN"""
    response = client.get("/api/products/AM-1000-BK-4W-A1?include_asin=false")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sku"] == "AM-1000-BK-4W-A1"
    assert "asin" not in data
    assert data["product_id"]["value"] == "0123456789012"

def test_get_product_without_product_id():
    """Test getting a product without including product ID"""
    response = client.get("/api/products/AM-1000-BK-4W-A1?include_product_id=false")
    assert response.status_code == 200
    
    data = response.json()
    assert data["sku"] == "AM-1000-BK-4W-A1"
    assert data["asin"] == "B08ZJWN6ZS"
    assert "product_id" not in data

def test_batch_get_products():
    """Test batch lookup of products"""
    response = client.post(
        "/api/products/batch",
        json={"skus": ["AM-1000-BK-4W-A1", "AM-1000-BL-4W-A3"]}
    )
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) == 2
    assert data["AM-1000-BK-4W-A1"]["sku"] == "AM-1000-BK-4W-A1"
    assert data["AM-1000-BK-4W-A1"]["asin"] == "B08ZJWN6ZS"
    assert data["AM-1000-BK-4W-A1"]["product_id"]["type"] == "EAN"
    
    assert data["AM-1000-BL-4W-A3"]["sku"] == "AM-1000-BL-4W-A3"
    assert data["AM-1000-BL-4W-A3"]["asin"] == "B08ZJZHS5V"
    assert data["AM-1000-BL-4W-A3"]["product_id"]["type"] == "UPC"

def test_batch_get_products_empty():
    """Test batch lookup with empty list"""
    response = client.post("/api/products/batch", json={"skus": []})
    assert response.status_code == 200
    assert response.json() == {} 