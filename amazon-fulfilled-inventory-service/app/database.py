import asyncpg
import logging
import os
from typing import Optional, List, Dict, Any, Union
from asyncpg.pool import Pool

from app.config import settings

# Configure logging
logger = logging.getLogger("database")

# Database connection pool
_pool: Optional[Pool] = None

class Database:
    """Database connection manager class"""
    
    def __init__(self, pool: Pool):
        """Initialize with a connection pool"""
        self.pool = pool
    
    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Execute a query and return the first result row as a dictionary"""
        try:
            async with self.pool.acquire() as conn:
                # Execute the query
                row = await conn.fetchrow(query, *args)
                if row:
                    return dict(row)
                return None
        except Exception as e:
            logger.error(f"Database query error: {str(e)}, Query: {query}")
            raise
    
    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a query and return all result rows as a list of dictionaries"""
        try:
            async with self.pool.acquire() as conn:
                # Execute the query
                rows = await conn.fetch(query, *args)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Database query error: {str(e)}, Query: {query}")
            raise
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query without returning results (INSERT, UPDATE, DELETE)"""
        try:
            async with self.pool.acquire() as conn:
                return await conn.execute(query, *args)
        except Exception as e:
            logger.error(f"Database execute error: {str(e)}, Query: {query}")
            raise
    
    async def execute_many(self, query: str, args_list) -> None:
        """Execute a query multiple times with different parameters"""
        try:
            async with self.pool.acquire() as conn:
                # Start a transaction
                async with conn.transaction():
                    # Prepare the statement
                    stmt = await conn.prepare(query)
                    # Execute for each set of parameters
                    for args in args_list:
                        await stmt.execute(*args)
        except Exception as e:
            logger.error(f"Database execute_many error: {str(e)}, Query: {query}")
            raise

async def get_db_pool() -> Database:
    """Get or create a database connection pool"""
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                host=settings.DATABASE_HOST,
                port=settings.DATABASE_PORT,
                user=settings.DATABASE_USER,
                password=settings.DATABASE_PASSWORD,
                database=settings.DATABASE_NAME,
                min_size=settings.DATABASE_MIN_CONNECTIONS,
                max_size=settings.DATABASE_MAX_CONNECTIONS,
            )
            logger.info("Database connection pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create database connection pool: {str(e)}")
            raise
    
    return Database(_pool)

async def close_db_pool() -> None:
    """Close the database connection pool"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed") 