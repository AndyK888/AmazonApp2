import os
import logging
import pandas as pd
import asyncio
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from app.database import Database
from app.models import ReportProcessingResult

# Configure logging
logger = logging.getLogger("report-processor")

class ReportProcessor:
    """Class to process Amazon-fulfilled Inventory report files"""
    
    def __init__(self, db: Database):
        """Initialize with database connection"""
        self.db = db
    
    async def process_report(self, file_path: str) -> ReportProcessingResult:
        """
        Process an Amazon-fulfilled Inventory report file
        
        Args:
            file_path: Path to the report file
            
        Returns:
            ReportProcessingResult with processing statistics
        """
        logger.info(f"Processing report file: {file_path}")
        
        if not os.path.exists(file_path):
            error_msg = f"File not found: {file_path}"
            logger.error(error_msg)
            return ReportProcessingResult(
                processed_rows=0,
                errors=[{"message": error_msg}],
                status="error",
                message=error_msg
            )
        
        try:
            # Create a unique ID for this file
            file_id = str(uuid.uuid4())
            
            # Read the report file
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8')
            total_rows = len(df)
            
            # Log the number of rows found
            logger.info(f"Found {total_rows} rows in report file")
            
            # Check for and handle duplicate SKUs in the input file
            duplicate_skus = df[df.duplicated(subset=['sku'], keep=False)]
            has_duplicates = len(duplicate_skus) > 0
            
            if has_duplicates:
                logger.warning(f"Found {len(duplicate_skus)} duplicate SKUs in the report")
            
            # Register the file in the database
            await self._register_file(
                file_id=file_id,
                original_name=os.path.basename(file_path),
                file_path=file_path,
                total_rows=total_rows
            )
            
            # Process the file rows
            processed_rows = await self._process_file_rows(df, file_id)
            
            # Update file status to completed
            await self._update_file_status(
                file_id=file_id,
                status="completed",
                processed_rows=processed_rows
            )
            
            # Return the result
            return ReportProcessingResult(
                processed_rows=processed_rows,
                errors=[],
                status="success",
                message=f"Successfully processed {processed_rows} rows"
            )
            
        except Exception as e:
            error_msg = f"Error processing report: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            # If file_id was created, update its status
            if 'file_id' in locals():
                try:
                    await self._update_file_status(
                        file_id=file_id,
                        status="error",
                        error_message=error_msg
                    )
                except Exception as update_err:
                    logger.error(f"Error updating file status: {str(update_err)}")
            
            return ReportProcessingResult(
                processed_rows=0,
                errors=[{"message": error_msg}],
                status="error",
                message=error_msg
            )
    
    async def _register_file(self, file_id: str, original_name: str, file_path: str, total_rows: int) -> None:
        """
        Register a file in the database before processing
        
        Args:
            file_id: Unique ID for this file
            original_name: Original filename
            file_path: Path to the file
            total_rows: Total number of rows in the file
        """
        file_size = os.path.getsize(file_path)
        
        query = """
            INSERT INTO uploaded_files (
                id, original_name, file_path, file_size, mime_type, 
                status, total_rows, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, 'text/tab-separated-values',
                'processing', $5, NOW(), NOW()
            )
        """
        
        await self.db.execute(
            query, 
            file_id, 
            original_name,
            file_path,
            file_size,
            total_rows
        )
        
        logger.info(f"Registered file with ID {file_id} and {total_rows} rows")
    
    async def _update_file_status(
        self, 
        file_id: str, 
        status: str,
        processed_rows: int = 0,
        error_message: Optional[str] = None
    ) -> None:
        """
        Update the status of a file in the database
        
        Args:
            file_id: ID of the file
            status: New status ('processing', 'completed', 'error')
            processed_rows: Number of successfully processed rows
            error_message: Error message if status is 'error'
        """
        query = """
            UPDATE uploaded_files 
            SET status = $1, 
                processed_rows = $2, 
                updated_at = NOW(),
                completed_at = CASE WHEN $1 IN ('completed', 'error') THEN NOW() ELSE NULL END,
                error_message = $3
            WHERE id = $4
        """
        
        await self.db.execute(
            query,
            status,
            processed_rows,
            error_message,
            file_id
        )
        
        logger.info(f"Updated file {file_id} status to {status}")
    
    async def _process_file_rows(self, df: pd.DataFrame, file_id: str) -> int:
        """
        Process all rows in the report file
        
        Args:
            df: Pandas DataFrame with the report data
            file_id: ID of the file being processed
            
        Returns:
            Number of successfully processed rows
        """
        # Standardize column names
        df.columns = [col.strip().lower() for col in df.columns]
        
        # Map column names to database fields (if needed)
        # This allows flexibility in case the report format changes slightly
        column_mapping = {
            'seller-sku': 'seller-sku',
            'sku': 'seller-sku',  # Handle alternate column name
            'asin': 'asin',
            'fnsku': 'fnsku',
            'product-name': 'product-name',
            'condition': 'condition',
            'your-price': 'your-price',
            'mfn-listing-exists': 'mfn-listing-exists',
            'mfn-fulfillable-quantity': 'mfn-fulfillable-quantity',
            'afn-listing-exists': 'afn-listing-exists',
            'afn-warehouse-quantity': 'afn-warehouse-quantity',
            'afn-fulfillable-quantity': 'afn-fulfillable-quantity',
            'afn-unsellable-quantity': 'afn-unsellable-quantity',
            'afn-reserved-quantity': 'afn-reserved-quantity',
            'afn-total-quantity': 'afn-total-quantity',
            'per-unit-volume': 'per-unit-volume',
            'afn-inbound-working-quantity': 'afn-inbound-working-quantity',
            'afn-inbound-shipped-quantity': 'afn-inbound-shipped-quantity',
            'afn-inbound-receiving-quantity': 'afn-inbound-receiving-quantity'
            # Add other mappings as needed
        }
        
        # Rename columns if needed
        for source, target in column_mapping.items():
            if source in df.columns and source != target:
                df[target] = df[source]
        
        # Count successful inserts
        successful_rows = 0
        errors = []
        
        # Process in chunks to avoid memory issues with large files
        chunk_size = 1000
        for i in range(0, len(df), chunk_size):
            chunk = df.iloc[i:i+chunk_size]
            logger.info(f"Processing chunk {i//chunk_size + 1}/{(len(df) + chunk_size - 1)//chunk_size}")
            
            # Process each row in the chunk
            for _, row in chunk.iterrows():
                try:
                    # Extract data from the row
                    sku = row.get('seller-sku')
                    
                    if not sku:
                        logger.warning(f"Skipping row with missing SKU")
                        continue
                    
                    # Check if this SKU already exists
                    existing = await self.db.fetch_one(
                        "SELECT id FROM fba_inventory WHERE \"seller-sku\" = $1",
                        sku
                    )
                    
                    # Convert row data to a dict for database
                    inventory_data = row.to_dict()
                    
                    # Add file_id to the data
                    inventory_data['file_id'] = file_id
                    
                    if existing:
                        # Update existing inventory
                        # Build dynamic query based on available columns
                        columns = []
                        values = []
                        for key, value in inventory_data.items():
                            # Skip certain columns or null values if needed
                            if key == 'id':
                                continue
                            
                            # Add column to update
                            columns.append(f"\"{key}\" = ${len(values) + 2}")
                            values.append(value)
                        
                        # Only update if we have columns to update
                        if columns:
                            query = f"""
                                UPDATE fba_inventory
                                SET {', '.join(columns)}
                                WHERE id = $1
                            """
                            await self.db.execute(query, existing["id"], *values)
                    else:
                        # Insert new inventory item
                        # Build dynamic query based on available columns
                        columns = []
                        placeholders = []
                        values = []
                        
                        for key, value in inventory_data.items():
                            # Don't insert 'id' as it's auto-generated
                            if key == 'id':
                                continue
                                
                            columns.append(f"\"{key}\"")
                            placeholders.append(f"${len(values) + 1}")
                            values.append(value)
                        
                        query = f"""
                            INSERT INTO fba_inventory ({', '.join(columns)})
                            VALUES ({', '.join(placeholders)})
                        """
                        await self.db.execute(query, *values)
                    
                    successful_rows += 1
                    
                    # Update processed rows count in the database periodically
                    if successful_rows % 100 == 0:
                        await self._update_file_status(
                            file_id=file_id,
                            status="processing",
                            processed_rows=successful_rows
                        )
                
                except Exception as e:
                    error_msg = f"Error processing row with SKU {row.get('seller-sku', 'unknown')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append({"sku": row.get('seller-sku'), "message": str(e)})
        
        # Log completion
        logger.info(f"Processed {successful_rows} rows with {len(errors)} errors")
        
        return successful_rows 