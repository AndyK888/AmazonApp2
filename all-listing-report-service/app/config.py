import os
from pydantic import BaseSettings, Field
from typing import Optional, Dict, Any
import logging

# Configure logging
logger = logging.getLogger("config")

class Settings(BaseSettings):
    """Application settings class"""
    
    # API configuration
    API_TITLE: str = "All Listing Report API"
    API_DESCRIPTION: str = "API for accessing Amazon All Listing Report data"
    API_VERSION: str = "1.0.0"
    
    # Database configuration
    DATABASE_HOST: str = Field(default="db", description="Database host")
    DATABASE_PORT: int = Field(default=5432, description="Database port")
    DATABASE_USER: str = Field(default="postgres", description="Database user")
    DATABASE_PASSWORD: str = Field(default="postgres", description="Database password")
    DATABASE_NAME: str = Field(default="amazon_inventory", description="Database name")
    DATABASE_MIN_CONNECTIONS: int = Field(default=5, description="Minimum database connections")
    DATABASE_MAX_CONNECTIONS: int = Field(default=20, description="Maximum database connections")
    
    # Report processing configuration
    MAX_REPORT_SIZE_MB: int = Field(default=100, description="Maximum report file size in MB")
    REPORT_CHUNK_SIZE: int = Field(default=1000, description="Number of rows to process in a chunk")
    UPLOAD_FOLDER: str = Field(default="/app/uploads", description="Folder for uploaded reports")
    
    # CORS configuration
    ALLOWED_ORIGINS: list = Field(default=["*"], description="Allowed origins for CORS")
    
    class Config:
        """Pydantic config"""
        env_file = ".env"
        env_prefix = "APP_"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Log loaded configuration (without sensitive values)
config_dict = settings.dict()
safe_config = {
    k: ("*" * 8 if k.endswith("PASSWORD") else v) 
    for k, v in config_dict.items()
}

logger.info(f"Loaded configuration: {safe_config}") 