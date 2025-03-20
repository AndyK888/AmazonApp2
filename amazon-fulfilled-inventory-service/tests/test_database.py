import pytest
import asyncio
import asyncpg
from unittest.mock import patch, MagicMock, AsyncMock

from app.database import Database

@pytest.fixture
def mock_pool():
    """Create a mock connection pool for database testing"""
    # Create a mock for the entire pool
    pool_mock = AsyncMock(spec=asyncpg.pool.Pool)
    
    # Create a mock for a connection
    conn_mock = AsyncMock(spec=asyncpg.Connection)
    
    # Mock the acquire method to return the connection as a context manager
    async def mock_acquire():
        return conn_mock
    
    # Set the mock_acquire function as the side effect
    pool_mock.acquire.side_effect = mock_acquire
    
    # Return our mocked pool
    return pool_mock, conn_mock

@pytest.fixture
async def mock_db(mock_pool):
    """Create a Database instance with a mocked connection pool"""
    pool_mock, conn_mock = mock_pool
    
    # Mock the asyncpg.create_pool function to return our mock pool
    with patch('asyncpg.create_pool', return_value=pool_mock):
        # Create the database instance with the mock pool
        db = Database()
        # Initialize the pool
        await db.connect("postgresql://fake_user:fake_pass@localhost/fake_db")
        # Return the database instance and the mock objects
        return db, pool_mock, conn_mock

@pytest.mark.asyncio
async def test_connect(mock_db):
    """Test database connection"""
    db, pool_mock, conn_mock = mock_db
    assert db.pool is pool_mock

@pytest.mark.asyncio
async def test_close():
    """Test database close"""
    # Create a mock pool
    pool_mock = AsyncMock(spec=asyncpg.pool.Pool)
    
    # Create a Database instance with the mock pool
    db = Database()
    db.pool = pool_mock
    
    # Close the database connection
    await db.close()
    
    # Check that the pool's close method was called
    pool_mock.close.assert_called_once()

@pytest.mark.asyncio
async def test_execute(mock_db):
    """Test executing a database query"""
    db, pool_mock, conn_mock = mock_db
    
    # Set up the mock response
    conn_mock.execute.return_value = "QUERY EXECUTED"
    
    # Execute a query
    result = await db.execute("INSERT INTO test_table (column) VALUES ($1)", "value")
    
    # Check that the connection's execute method was called with the right parameters
    conn_mock.execute.assert_called_once_with("INSERT INTO test_table (column) VALUES ($1)", "value")
    
    # Check that the result is what we expected
    assert result == "QUERY EXECUTED"

@pytest.mark.asyncio
async def test_fetch_one(mock_db):
    """Test fetching a single row from the database"""
    db, pool_mock, conn_mock = mock_db
    
    # Set up the mock response
    mock_record = {"id": 1, "name": "Test Name"}
    conn_mock.fetchrow.return_value = mock_record
    
    # Execute a query
    result = await db.fetch_one("SELECT * FROM test_table WHERE id = $1", 1)
    
    # Check that the connection's fetchrow method was called with the right parameters
    conn_mock.fetchrow.assert_called_once_with("SELECT * FROM test_table WHERE id = $1", 1)
    
    # Check that the result is what we expected
    assert result == mock_record

@pytest.mark.asyncio
async def test_fetch_all(mock_db):
    """Test fetching multiple rows from the database"""
    db, pool_mock, conn_mock = mock_db
    
    # Set up the mock response
    mock_records = [
        {"id": 1, "name": "Test Name 1"},
        {"id": 2, "name": "Test Name 2"}
    ]
    conn_mock.fetch.return_value = mock_records
    
    # Execute a query
    result = await db.fetch_all("SELECT * FROM test_table")
    
    # Check that the connection's fetch method was called with the right parameters
    conn_mock.fetch.assert_called_once_with("SELECT * FROM test_table")
    
    # Check that the result is what we expected
    assert result == mock_records

@pytest.mark.asyncio
async def test_transaction(mock_db):
    """Test database transaction support"""
    db, pool_mock, conn_mock = mock_db
    
    # Start a transaction
    await db.begin()
    
    # Check that the transaction was started
    conn_mock.transaction.assert_called_once()
    
    # Commit the transaction
    await db.commit()
    
    # Mock transaction object from the connection
    mock_transaction = conn_mock.transaction()
    
    # Check that the transaction was committed
    mock_transaction.commit.assert_called_once()
    
    # Now test rolling back a transaction
    # Reset the mock
    conn_mock.transaction.reset_mock()
    mock_transaction.reset_mock()
    
    # Start a new transaction
    await db.begin()
    
    # Rollback the transaction
    await db.rollback()
    
    # Check that the transaction was rolled back
    mock_transaction = conn_mock.transaction()
    mock_transaction.rollback.assert_called_once() 