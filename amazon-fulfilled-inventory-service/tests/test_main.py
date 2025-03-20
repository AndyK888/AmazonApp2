import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app, startup, shutdown
from app.database import Database

client = TestClient(app)

@pytest.fixture
def mock_db():
    """Create a mock database instance for testing"""
    db = MagicMock(spec=Database)
    
    # Set up mock methods
    async def mock_connect(db_url):
        return None
    
    async def mock_close():
        return None
    
    db.connect.side_effect = mock_connect
    db.close.side_effect = mock_close
    
    return db

@pytest.mark.asyncio
async def test_startup(mock_db):
    """Test the application startup event handler"""
    with patch("app.main.get_db_instance", return_value=mock_db):
        # Call the startup function
        await startup()
        
        # Check that the database connect method was called
        mock_db.connect.assert_called_once()

@pytest.mark.asyncio
async def test_shutdown(mock_db):
    """Test the application shutdown event handler"""
    with patch("app.main.get_db_instance", return_value=mock_db):
        # Call the shutdown function
        await shutdown()
        
        # Check that the database close method was called
        mock_db.close.assert_called_once()

def test_read_health():
    """Test the health check endpoint"""
    # Call the health endpoint
    response = client.get("/health")
    
    # Check the response
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_read_root():
    """Test the root endpoint"""
    # Call the root endpoint
    response = client.get("/")
    
    # Check the response
    assert response.status_code == 200
    assert "message" in response.json()
    assert "Amazon-fulfilled Inventory Service" in response.json()["message"]

@pytest.mark.asyncio
async def test_process_report(mock_db):
    """Test the report processing endpoint"""
    # Mock the processor and its process_report method
    with patch("app.main.ReportProcessor") as mock_processor_class:
        # Set up the mock processor instance
        mock_processor = MagicMock()
        mock_processor_class.return_value = mock_processor
        
        # Set up the mock process_report method
        async def mock_process_report(report_path):
            return {"processed": True, "report_path": report_path}
        
        mock_processor.process_report.side_effect = mock_process_report
        
        # Mock the database dependency
        with patch("app.main.get_db_pool", return_value=mock_db):
            # Call the process_report endpoint
            report_path = "/path/to/report.csv"
            response = client.post(
                "/api/process",
                json={"report_path": report_path}
            )
            
            # Check the response
            assert response.status_code == 200
            assert response.json() == {"status": "success", "message": f"Report {report_path} processed successfully"}
            
            # Check that the processor was created with the database
            mock_processor_class.assert_called_once_with(db=mock_db)
            
            # Check that process_report was called with the correct path
            mock_processor.process_report.assert_called_once_with(report_path)

@pytest.mark.asyncio
async def test_process_report_error(mock_db):
    """Test the report processing endpoint with an error"""
    # Mock the processor and its process_report method
    with patch("app.main.ReportProcessor") as mock_processor_class:
        # Set up the mock processor instance
        mock_processor = MagicMock()
        mock_processor_class.return_value = mock_processor
        
        # Set up the mock process_report method to raise an exception
        async def mock_process_report(report_path):
            raise Exception("Test error")
        
        mock_processor.process_report.side_effect = mock_process_report
        
        # Mock the database dependency
        with patch("app.main.get_db_pool", return_value=mock_db):
            # Call the process_report endpoint
            report_path = "/path/to/report.csv"
            response = client.post(
                "/api/process",
                json={"report_path": report_path}
            )
            
            # Check the response
            assert response.status_code == 500
            assert "error" in response.json()
            assert "Test error" in response.json()["error"] 