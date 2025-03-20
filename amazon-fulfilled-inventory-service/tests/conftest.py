import pytest
import asyncio
from unittest.mock import MagicMock
import os
import sys
from dotenv import load_dotenv

# Add the app directory to the path so we can import from there
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env file for testing
load_dotenv()

# Override environment variables for testing if needed
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/test_db"
os.environ["TEST_MODE"] = "true"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def test_config():
    """Return test configuration values"""
    return {
        "database_url": os.environ.get("DATABASE_URL"),
        "report_directory": os.environ.get("REPORT_DIRECTORY", "test_reports"),
        "test_mode": True
    }

@pytest.fixture
def mock_asyncio_sleep():
    """Mock asyncio.sleep for testing async code with delays"""
    original_sleep = asyncio.sleep
    
    async def mock_sleep(seconds):
        # For testing, we don't actually want to sleep
        # Just advance the event loop with a very small delay
        await original_sleep(0.001)
    
    # Set up the mock
    asyncio.sleep = mock_sleep
    
    # Return control to the test
    yield
    
    # Restore the original sleep function
    asyncio.sleep = original_sleep 