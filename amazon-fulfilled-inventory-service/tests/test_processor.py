import pytest
import asyncio
from unittest.mock import patch, MagicMock, mock_open
import pandas as pd
import os
import json
from datetime import datetime

from app.processor import ReportProcessor
from app.database import Database

# Test data as would be found in a CSV file
SAMPLE_CSV_DATA = """sku,asin,fnsku,product-name,condition,your-price,mfn-listing-exists,mfn-fulfillable-quantity,afn-listing-exists,afn-warehouse-quantity,afn-fulfillable-quantity,afn-unsellable-quantity,afn-reserved-quantity,afn-total-quantity,per-unit-volume,afn-inbound-working-quantity,afn-inbound-shipped-quantity,afn-inbound-receiving-quantity
AM-1000-BK-4W-A1,B08ZJWN6ZS,X00ABCD123,"ATOM SKATES Outdoor Quad Roller Wheels",New,24.99,No,0,Yes,100,95,5,0,100,0.1,0,50,0
AM-1000-BL-4W-A3,B08ZJZHS5V,X00EFGH456,"ATOM SKATES Outdoor Quad Roller Wheels Blue",New,24.99,No,0,Yes,75,70,5,0,75,0.1,0,25,0
"""

@pytest.fixture
def sample_dataframe():
    """Create a sample dataframe from CSV data"""
    import io
    return pd.read_csv(io.StringIO(SAMPLE_CSV_DATA))

@pytest.fixture
def mock_db():
    """Mock database for testing"""
    mock = MagicMock(spec=Database)
    # Mock the execute method to return success
    async def mock_execute(*args, **kwargs):
        return True
    mock.execute.side_effect = mock_execute
    
    # Mock the begin method for transaction support
    mock.begin = MagicMock()
    mock.commit = MagicMock()
    mock.rollback = MagicMock()
    
    return mock

@pytest.fixture
def processor(mock_db):
    """Create a processor instance with mocked database"""
    return ReportProcessor(db=mock_db)

@patch("builtins.open", new_callable=mock_open, read_data=SAMPLE_CSV_DATA)
@patch("os.path.exists", return_value=True)
@patch("pandas.read_csv")
def test_load_report(mock_read_csv, mock_exists, mock_file, processor, sample_dataframe):
    """Test loading a report file"""
    # Configure the mock to return our sample dataframe
    mock_read_csv.return_value = sample_dataframe
    
    # Call the method
    result = processor.load_report("dummy_path.csv")
    
    # Check that the file was opened
    mock_file.assert_called_once_with("dummy_path.csv", "r", encoding="utf-8-sig")
    
    # Check that read_csv was called
    mock_read_csv.assert_called_once()
    
    # Verify the result is our sample dataframe
    assert result is sample_dataframe
    
    # Verify column renames occurred if implemented in the processor
    if hasattr(processor, "rename_columns"):
        # This check depends on the implementation of rename_columns
        pass

@pytest.mark.asyncio
async def test_process_report(processor, sample_dataframe):
    """Test processing a report"""
    # Mock the methods used by process_report
    processor.load_report = MagicMock(return_value=sample_dataframe)
    processor.transform_data = MagicMock(return_value=sample_dataframe)
    processor.save_to_database = MagicMock()
    
    # Call the method
    await processor.process_report("dummy_path.csv")
    
    # Check that the methods were called with correct arguments
    processor.load_report.assert_called_once_with("dummy_path.csv")
    processor.transform_data.assert_called_once_with(sample_dataframe)
    processor.save_to_database.assert_called_once()

@pytest.mark.asyncio
async def test_save_to_database(processor, sample_dataframe, mock_db):
    """Test saving data to the database"""
    # Mock begin/commit methods for transaction handling
    mock_db.begin = MagicMock()
    mock_db.commit = MagicMock()
    
    # Call the method
    await processor.save_to_database(sample_dataframe)
    
    # Check that transaction was started
    mock_db.begin.assert_called_once()
    
    # Check that execute was called for each row in the dataframe
    assert mock_db.execute.call_count == len(sample_dataframe)
    
    # Check that the transaction was committed
    mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_save_to_database_error(processor, sample_dataframe, mock_db):
    """Test error handling when saving to database"""
    # Mock an exception during execute
    mock_db.execute.side_effect = Exception("Database error")
    
    # Call the method which should handle the exception
    with pytest.raises(Exception):
        await processor.save_to_database(sample_dataframe)
    
    # Check that rollback was called
    mock_db.rollback.assert_called_once()

def test_transform_data(processor, sample_dataframe):
    """Test data transformation logic"""
    # Call the transform_data method
    transformed_df = processor.transform_data(sample_dataframe)
    
    # Check that the dataframe is not None
    assert transformed_df is not None
    
    # Check that basic column names and data types are correct
    # These assertions should be adjusted based on the actual transformation logic
    assert "sku" in transformed_df.columns
    assert "asin" in transformed_df.columns
    assert "fnsku" in transformed_df.columns
    assert "product_name" in transformed_df.columns or "product-name" in transformed_df.columns
    
    # Check specific transformations if applicable
    # For example, if your processor renames columns:
    if "product_name" in transformed_df.columns:
        assert transformed_df["product_name"].iloc[0] == "ATOM SKATES Outdoor Quad Roller Wheels" 