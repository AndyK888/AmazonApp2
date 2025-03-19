import os
import time
import json
import pandas as pd
import logging
from celery import Celery
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('report_processor')

# Connect to Redis
app = Celery(
    'report_processor',
    broker=os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
)

# Database connection
def get_db_connection():
    conn = psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'db'),
        database=os.getenv('POSTGRES_DB', 'amazon_inventory'),
        user=os.getenv('POSTGRES_USER', 'postgres'),
        password=os.getenv('POSTGRES_PASSWORD', 'postgres')
    )
    conn.autocommit = True
    return conn

@app.task(name='process_report')
def process_report(file_path, file_id, user_id=None):
    """
    Process Amazon inventory report file and store results in database
    """
    try:
        logger.info(f"Processing report: {file_path} (ID: {file_id})")
        
        # Update file status to "processing"
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE uploaded_files SET status = 'processing', updated_at = NOW() WHERE id = %s",
                    (file_id,)
                )
        
        # Read the file
        df = pd.read_csv(file_path, sep='\t', encoding='utf-8')
        df.columns = [col.strip() for col in df.columns]
        
        # Check for duplicate SKUs in the input file
        duplicate_skus = df[df.duplicated(subset=['seller-sku'], keep=False)]
        has_duplicates = len(duplicate_skus) > 0
        duplicate_count = len(duplicate_skus)
        duplicate_info = {}
        
        # Store information about duplicates if found
        if has_duplicates:
            logger.info(f"Found {duplicate_count} duplicate SKUs in file {file_id}")
            
            # Group duplicates by SKU
            duplicate_groups = df[df.duplicated(subset=['seller-sku'], keep=False)].groupby('seller-sku')
            
            for sku, group in duplicate_groups:
                duplicate_info[sku] = []
                for _, row in group.iterrows():
                    # Extract key fields for comparison
                    duplicate_info[sku].append({
                        'row_index': row.name,
                        'asin': row.get('asin1') or row.get('asin'),
                        'upc': row.get('product-id') if row.get('product-id-type') == '3' else None,
                        'ean': row.get('product-id') if row.get('product-id-type') == '4' else None,
                        'fnsku': row.get('fnsku'),
                        'price': row.get('price'),
                        'quantity': row.get('quantity'),
                        'condition': row.get('item-condition'),
                        'title': row.get('item-name')
                    })
            
            # Store duplicate info in a separate table for user resolution
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO duplicate_sku_issues 
                        (file_id, duplicate_info, status, created_at)
                        VALUES (%s, %s, 'pending', NOW())
                        RETURNING id
                        """,
                        (file_id, json.dumps(duplicate_info))
                    )
                    duplicate_issue_id = cur.fetchone()[0]
            
            # Set file status to indicate duplicates need resolution
            update_file_status(file_id, 'duplicate_detected', {
                'duplicate_count': duplicate_count,
                'duplicate_issue_id': duplicate_issue_id
            })
            
            # Early return - don't process until duplicates are resolved
            return {
                'status': 'duplicate_detected',
                'message': f'Found {duplicate_count} duplicate SKUs in file. User resolution required.',
                'duplicate_issue_id': duplicate_issue_id
            }
        
        # Continue with normal processing if no duplicates
        return process_file_without_duplicates(df, file_id, user_id)
        
    except Exception as e:
        logger.error(f"Error processing report {file_id}: {str(e)}")
        
        # Update file status to "error"
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE uploaded_files SET status = 'error', error_message = %s, updated_at = NOW() WHERE id = %s",
                    (str(e), file_id)
                )
        
        # Re-raise the exception for Celery to handle
        raise

def process_file_without_duplicates(df, file_id, user_id=None):
    """Process a file that has no duplicates or has been resolved"""
    try:
        # Ensure no duplicate SKUs in the input file by keeping only the first occurrence
        df = df.drop_duplicates(subset=['seller-sku'], keep='first')
        
        # Process records in chunks
        chunk_size = 1000
        total_rows = len(df)
        processed_rows = 0
        identifier_changes = []
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                for i in range(0, total_rows, chunk_size):
                    chunk = df.iloc[i:i+chunk_size]
                    
                    # Process each listing in the chunk
                    for _, row in chunk.iterrows():
                        # Extract data from the row
                        listing_data = {}
                        for col in df.columns:
                            # Convert column names with spaces to use hyphens (matching DB schema)
                            db_col = col.strip().replace(' ', '-').lower()
                            value = row[col]
                            
                            # Skip null values
                            if pd.isna(value) or value == '':
                                continue
                                
                            # Handle data type conversions
                            if db_col in ['price']:
                                try:
                                    value = float(value)
                                except (ValueError, TypeError):
                                    value = None
                            elif db_col in ['quantity', 'pending-quantity']:
                                try:
                                    value = int(value)
                                except (ValueError, TypeError):
                                    value = 0
                            elif db_col in ['item-is-marketplace', 'will-ship-internationally', 
                                           'expedited-shipping', 'zshop-boldface']:
                                if isinstance(value, str):
                                    value = value.lower() in ['y', 'yes', 'true']
                                
                            # Add to listing data
                            if value is not None:
                                listing_data[db_col] = value
                        
                        # Skip rows without SKU
                        if 'seller-sku' not in listing_data:
                            logger.warning(f"Skipping row without seller-sku: {listing_data}")
                            continue
                        
                        seller_sku = listing_data['seller-sku']
                        asin = listing_data.get('asin1') or listing_data.get('asin')
                        
                        # Determine product identifiers
                        upc = None
                        ean = None
                        if 'product-id-type' in listing_data and 'product-id' in listing_data:
                            if listing_data['product-id-type'] == '3':
                                upc = listing_data['product-id']
                            elif listing_data['product-id-type'] == '4':
                                ean = listing_data['product-id']
                        
                        fnsku = listing_data.get('fnsku')
                        
                        # Check for existing product identifiers
                        cur.execute(
                            'SELECT * FROM product_identifiers WHERE seller_sku = %s',
                            (seller_sku,)
                        )
                        existing = cur.fetchone()
                        
                        if existing:
                            # Check for changes compared to current values
                            id_val, existing_sku, existing_upc, existing_ean, existing_asin, existing_fnsku, last_updated = existing
                            
                            # Record any changes from current values
                            if asin and asin != existing_asin:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'ASIN',
                                    'old_value': existing_asin,
                                    'new_value': asin,
                                    'file_id': file_id
                                })
                            
                            if upc and upc != existing_upc:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'UPC',
                                    'old_value': existing_upc,
                                    'new_value': upc,
                                    'file_id': file_id
                                })
                            
                            if ean and ean != existing_ean:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'EAN',
                                    'old_value': existing_ean,
                                    'new_value': ean,
                                    'file_id': file_id
                                })
                            
                            if fnsku and fnsku != existing_fnsku:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'FNSKU',
                                    'old_value': existing_fnsku,
                                    'new_value': fnsku,
                                    'file_id': file_id
                                })
                            
                            # ALWAYS update the current values in product_identifiers
                            # This ensures we always have the latest value
                            update_fields = []
                            update_values = []
                            
                            if asin:
                                update_fields.append("asin = %s")
                                update_values.append(asin)
                            
                            if upc:
                                update_fields.append("upc = %s")
                                update_values.append(upc)
                                
                            if ean:
                                update_fields.append("ean = %s")
                                update_values.append(ean)
                                
                            if fnsku:
                                update_fields.append("fnsku = %s")
                                update_values.append(fnsku)
                            
                            if update_fields:
                                update_fields.append("last_updated = NOW()")
                                update_query = f"""
                                    UPDATE product_identifiers 
                                    SET {', '.join(update_fields)} 
                                    WHERE seller_sku = %s
                                """
                                cur.execute(update_query, update_values + [seller_sku])
                        else:
                            # New record - insert into product_identifiers
                            cur.execute(
                                """
                                INSERT INTO product_identifiers 
                                (seller_sku, upc, ean, asin, fnsku) 
                                VALUES (%s, %s, %s, %s, %s)
                                """,
                                (seller_sku, upc, ean, asin, fnsku)
                            )
                            
                            # Record as new identifiers if values exist
                            if asin:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'ASIN',
                                    'old_value': None,
                                    'new_value': asin,
                                    'file_id': file_id
                                })
                            
                            if upc:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'UPC',
                                    'old_value': None,
                                    'new_value': upc,
                                    'file_id': file_id
                                })
                                
                            if ean:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'EAN',
                                    'old_value': None,
                                    'new_value': ean,
                                    'file_id': file_id
                                })
                                
                            if fnsku:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'FNSKU',
                                    'old_value': None,
                                    'new_value': fnsku,
                                    'file_id': file_id
                                })
                        
                        # Check if the listing exists
                        cur.execute(
                            'SELECT id FROM listings WHERE "seller-sku" = %s',
                            (seller_sku,)
                        )
                        existing_listing = cur.fetchone()
                        
                        if existing_listing:
                            # Update existing listing
                            id_val = existing_listing[0]
                            
                            fields = []
                            values = []
                            
                            for key, value in listing_data.items():
                                fields.append(f'"{key}" = %s')
                                values.append(value)
                            
                            # Add file_id to the record
                            fields.append('file_id = %s')
                            values.append(file_id)
                            
                            # Add ID at the end
                            values.append(id_val)
                            
                            sql = f"UPDATE listings SET {', '.join(fields)} WHERE id = %s"
                            cur.execute(sql, values)
                        else:
                            # Insert new listing
                            fields = [f'"{key}"' for key in listing_data.keys()]
                            fields.append('file_id')
                            
                            placeholders = ["%s"] * len(fields)
                            values = list(listing_data.values())
                            values.append(file_id)
                            
                            sql = f"INSERT INTO listings ({', '.join(fields)}) VALUES ({', '.join(placeholders)}) RETURNING id"
                            cur.execute(sql, values)
                            listing_id = cur.fetchone()[0]
                    
                    processed_rows += len(chunk)
                    
                    # Update the progress
                    update_progress(file_id, processed_rows, total_rows)
                
                # Insert all accumulated identifier changes for audit history
                if identifier_changes:
                    for change in identifier_changes:
                        # Find the listing_id if available
                        listing_id = None
                        if change['seller_sku']:
                            cur.execute(
                                'SELECT id FROM listings WHERE "seller-sku" = %s',
                                (change['seller_sku'],)
                            )
                            result = cur.fetchone()
                            if result:
                                listing_id = result[0]
                        
                        # Insert the change record
                        cur.execute(
                            """
                            INSERT INTO identifier_changes 
                            (listing_id, seller_sku, change_type, identifier_type, 
                             old_value, new_value, file_id) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                listing_id,
                                change['seller_sku'],
                                change['change_type'],
                                change['identifier_type'],
                                change['old_value'],
                                change['new_value'],
                                change['file_id']
                            )
                        )
        
        # Update file status to "completed"
        update_file_status(file_id, 'completed', {
            'rows_processed': total_rows,
            'identifier_changes': len(identifier_changes)
        })
        
        logger.info(f"Completed processing of report {file_id}: {total_rows} rows processed, {len(identifier_changes)} identifier changes")
        
        return {
            'status': 'success',
            'message': f'Report processed successfully. {total_rows} records processed.',
            'identifier_changes': len(identifier_changes)
        }
        
    except Exception as e:
        logger.error(f"Error in process_file_without_duplicates for {file_id}: {str(e)}")
        update_file_status(file_id, 'error', {
            'error': str(e),
            'step': 'processing_no_duplicates'
        })
        return {
            'status': 'error',
            'message': f'Error processing report: {str(e)}'
        }

def update_file_status(file_id, status, details=None):
    """Update the status of a file in the database"""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if details:
                    cur.execute(
                        """
                        UPDATE uploaded_files 
                        SET status = %s, updated_at = NOW(), process_status_details = %s
                        WHERE id = %s
                        """,
                        (status, json.dumps(details), file_id)
                    )
                else:
                    cur.execute(
                        """
                        UPDATE uploaded_files 
                        SET status = %s, updated_at = NOW()
                        WHERE id = %s
                        """,
                        (status, file_id)
                    )
    except Exception as e:
        logger.error(f"Error updating file status: {str(e)}")

def update_progress(file_id, processed_rows, total_rows):
    """Update processing progress for a file"""
    progress = round((processed_rows / total_rows) * 100) if total_rows > 0 else 0
    update_file_status(file_id, 'processing', {
        'progress': progress,
        'processed': processed_rows,
        'total': total_rows
    })

@app.task(name='resolve_duplicates')
def resolve_duplicates(issue_id, file_id):
    """Apply duplicate resolutions and continue processing"""
    try:
        logger.info(f"Resolving duplicates for issue {issue_id}, file {file_id}")
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get the issue and resolutions
                cur.execute(
                    "SELECT duplicate_info, resolution_strategy FROM duplicate_sku_issues WHERE id = %s",
                    (issue_id,)
                )
                result = cur.fetchone()
                if not result:
                    raise ValueError(f"Duplicate issue {issue_id} not found")
                
                duplicate_info, resolutions = result
                
                # Get the file path
                cur.execute(
                    "SELECT file_path FROM uploaded_files WHERE id = %s",
                    (file_id,)
                )
                file_path = cur.fetchone()[0]
                
                # Load the original file
                df = pd.read_csv(file_path, sep='\t', encoding='utf-8')
                df.columns = [col.strip() for col in df.columns]
                
                # Apply resolutions for each SKU
                resolved_df = apply_duplicate_resolutions(df, duplicate_info, resolutions)
                
                # Save resolved file
                resolved_file_path = file_path.replace('.txt', '_resolved.txt')
                resolved_df.to_csv(resolved_file_path, sep='\t', index=False)
                
                # Update file path and status
                cur.execute(
                    """
                    UPDATE uploaded_files 
                    SET file_path = %s, status = 'ready_to_process', 
                        updated_at = NOW(), 
                        process_status_details = jsonb_set(
                            COALESCE(process_status_details, '{}'::jsonb), 
                            '{duplicate_resolved}', 
                            'true'::jsonb
                        )
                    WHERE id = %s
                    """,
                    (resolved_file_path, file_id)
                )
        
        logger.info(f"Duplicates resolved, continuing with processing for file {file_id}")
        
        # Now trigger the normal processing with the resolved file
        return process_report.delay(resolved_file_path, file_id)
        
    except Exception as e:
        logger.error(f"Error resolving duplicates for {file_id}: {str(e)}")
        # Update file status to error
        update_file_status(file_id, 'error', {
            'error': str(e),
            'step': 'duplicate_resolution'
        })
        return {
            'status': 'error',
            'message': str(e)
        }

def apply_duplicate_resolutions(df, duplicate_info, resolutions):
    """Apply user's resolution choices to the dataframe"""
    # Create a copy to work with
    resolved_df = df.copy()
    
    for sku, strategy in resolutions.items():
        if sku not in duplicate_info:
            continue  # Skip if SKU not in duplicate info
        
        # Get all rows with this SKU
        sku_mask = df['seller-sku'] == sku
        sku_rows = df[sku_mask]
        
        if strategy['resolution_type'] == 'keep_one':
            # Keep only the specified row index
            row_to_keep = strategy['row_index']
            # Drop all rows with this SKU except the one to keep
            drop_indices = sku_rows.index.tolist()
            drop_indices.remove(row_to_keep)
            resolved_df = resolved_df.drop(drop_indices)
            
        elif strategy['resolution_type'] == 'keep_newest':
            # Keep only the last row (assuming this is the newest)
            drop_indices = sku_rows.index.tolist()[:-1]
            resolved_df = resolved_df.drop(drop_indices)
            
        elif strategy['resolution_type'] == 'merge':
            # Create a merged row based on field selections
            merged_row = {}
            for field, row_index in strategy['field_selections'].items():
                # Find the row with this index
                source_row = df.loc[row_index]
                merged_row[field] = source_row.get(field)
            
            # Update the first row with merged values
            first_row_idx = sku_rows.index[0]
            for field, value in merged_row.items():
                resolved_df.at[first_row_idx, field] = value
                
            # Drop other rows
            drop_indices = sku_rows.index.tolist()[1:]
            resolved_df = resolved_df.drop(drop_indices)
            
        elif strategy['resolution_type'] == 'rename':
            # Rename the SKU for specified rows
            for rename_info in strategy['renames']:
                row_idx = rename_info['row_index']
                new_sku = rename_info['new_sku']
                resolved_df.at[row_idx, 'seller-sku'] = new_sku
    
    return resolved_df

@app.task(name='process_all_listings_report')
def process_all_listings_report(file_path, file_id, user_id=None):
    """
    Process Amazon All Listings Report file and store results in database
    This is similar to process_report but specific to the All Listings Report format
    """
    try:
        logger.info(f"Processing All Listings report: {file_path} (ID: {file_id})")
        
        # Update file status to "processing"
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE uploaded_files SET status = 'processing', updated_at = NOW() WHERE id = %s",
                    (file_id,)
                )
        
        # Read the file
        df = pd.read_csv(file_path, sep='\t', encoding='utf-8')
        df.columns = [col.strip() for col in df.columns]
        
        # Check for duplicate SKUs in the input file
        duplicate_skus = df[df.duplicated(subset=['seller-sku'], keep=False)]
        has_duplicates = len(duplicate_skus) > 0
        duplicate_count = len(duplicate_skus)
        duplicate_info = {}
        
        # Store information about duplicates if found
        if has_duplicates:
            logger.info(f"Found {duplicate_count} duplicate SKUs in file {file_id}")
            
            # Group duplicates by SKU
            duplicate_groups = df[df.duplicated(subset=['seller-sku'], keep=False)].groupby('seller-sku')
            
            for sku, group in duplicate_groups:
                duplicate_info[sku] = []
                for _, row in group.iterrows():
                    # Extract key fields for comparison
                    duplicate_info[sku].append({
                        'row_index': row.name,
                        'asin': row.get('asin1') or row.get('asin'),
                        'upc': row.get('product-id') if row.get('product-id-type') == '3' else None,
                        'ean': row.get('product-id') if row.get('product-id-type') == '4' else None,
                        'fnsku': row.get('fnsku'),
                        'price': row.get('price'),
                        'quantity': row.get('quantity'),
                        'condition': row.get('item-condition'),
                        'title': row.get('item-name')
                    })
            
            # Store duplicate info in a separate table for user resolution
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO duplicate_sku_issues 
                        (file_id, duplicate_info, status, created_at)
                        VALUES (%s, %s, 'pending', NOW())
                        RETURNING id
                        """,
                        (file_id, json.dumps(duplicate_info))
                    )
                    duplicate_issue_id = cur.fetchone()[0]
            
            # Set file status to indicate duplicates need resolution
            update_file_status(file_id, 'duplicate_detected', {
                'duplicate_count': duplicate_count,
                'duplicate_issue_id': duplicate_issue_id
            })
            
            # Early return - don't process until duplicates are resolved
            return {
                'status': 'duplicate_detected',
                'message': f'Found {duplicate_count} duplicate SKUs in file. User resolution required.',
                'duplicate_issue_id': duplicate_issue_id
            }
        
        # Continue with normal processing if no duplicates
        return process_file_without_duplicates(df, file_id, user_id, report_type='all_listings')
        
    except Exception as e:
        logger.error(f"Error processing All Listings report {file_id}: {str(e)}")
        
        # Update file status to "error"
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE uploaded_files SET status = 'error', error_message = %s, updated_at = NOW() WHERE id = %s",
                    (str(e), file_id)
                )
        
        # Re-raise the exception for Celery to handle
        raise

def process_file_without_duplicates(df, file_id, user_id=None, report_type='default'):
    """Process a file that has no duplicates or has been resolved"""
    try:
        # Ensure no duplicate SKUs in the input file by keeping only the first occurrence
        df = df.drop_duplicates(subset=['seller-sku'], keep='first')
        
        # Process records in chunks
        chunk_size = 1000
        total_rows = len(df)
        processed_rows = 0
        identifier_changes = []
        
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                for i in range(0, total_rows, chunk_size):
                    chunk = df.iloc[i:i+chunk_size]
                    
                    # Process each listing in the chunk
                    for _, row in chunk.iterrows():
                        # Extract data from the row
                        listing_data = {}
                        for col in df.columns:
                            # Convert column names with spaces to use hyphens (matching DB schema)
                            db_col = col.strip().replace(' ', '-').lower()
                            value = row[col]
                            
                            # Skip null values
                            if pd.isna(value) or value == '':
                                continue
                                
                            # Handle data type conversions
                            if db_col in ['price']:
                                try:
                                    value = float(value)
                                except (ValueError, TypeError):
                                    value = None
                            elif db_col in ['quantity', 'pending-quantity']:
                                try:
                                    value = int(value)
                                except (ValueError, TypeError):
                                    value = 0
                            elif db_col in ['item-is-marketplace', 'will-ship-internationally', 
                                           'expedited-shipping', 'zshop-boldface']:
                                if isinstance(value, str):
                                    value = value.lower() in ['y', 'yes', 'true']
                                
                            # Add to listing data
                            if value is not None:
                                listing_data[db_col] = value
                        
                        # Skip rows without SKU
                        if 'seller-sku' not in listing_data:
                            logger.warning(f"Skipping row without seller-sku: {listing_data}")
                            continue
                        
                        seller_sku = listing_data['seller-sku']
                        asin = listing_data.get('asin1') or listing_data.get('asin')
                        
                        # Determine product identifiers
                        upc = None
                        ean = None
                        if 'product-id-type' in listing_data and 'product-id' in listing_data:
                            if listing_data['product-id-type'] == '3':
                                upc = listing_data['product-id']
                            elif listing_data['product-id-type'] == '4':
                                ean = listing_data['product-id']
                        
                        fnsku = listing_data.get('fnsku')
                        
                        # Check for existing product identifiers
                        cur.execute(
                            'SELECT * FROM product_identifiers WHERE seller_sku = %s',
                            (seller_sku,)
                        )
                        existing = cur.fetchone()
                        
                        if existing:
                            # Check for changes compared to current values
                            id_val, existing_sku, existing_upc, existing_ean, existing_asin, existing_fnsku, last_updated = existing
                            
                            # Record any changes from current values
                            if asin and asin != existing_asin:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'ASIN',
                                    'old_value': existing_asin,
                                    'new_value': asin,
                                    'file_id': file_id
                                })
                            
                            if upc and upc != existing_upc:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'UPC',
                                    'old_value': existing_upc,
                                    'new_value': upc,
                                    'file_id': file_id
                                })
                            
                            if ean and ean != existing_ean:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'EAN',
                                    'old_value': existing_ean,
                                    'new_value': ean,
                                    'file_id': file_id
                                })
                            
                            if fnsku and fnsku != existing_fnsku:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'modified',
                                    'identifier_type': 'FNSKU',
                                    'old_value': existing_fnsku,
                                    'new_value': fnsku,
                                    'file_id': file_id
                                })
                            
                            # ALWAYS update the current values in product_identifiers
                            # This ensures we always have the latest value
                            update_fields = []
                            update_values = []
                            
                            if asin:
                                update_fields.append("asin = %s")
                                update_values.append(asin)
                            
                            if upc:
                                update_fields.append("upc = %s")
                                update_values.append(upc)
                                
                            if ean:
                                update_fields.append("ean = %s")
                                update_values.append(ean)
                                
                            if fnsku:
                                update_fields.append("fnsku = %s")
                                update_values.append(fnsku)
                            
                            if update_fields:
                                update_fields.append("last_updated = NOW()")
                                update_query = f"""
                                    UPDATE product_identifiers 
                                    SET {', '.join(update_fields)} 
                                    WHERE seller_sku = %s
                                """
                                cur.execute(update_query, update_values + [seller_sku])
                        else:
                            # New record - insert into product_identifiers
                            cur.execute(
                                """
                                INSERT INTO product_identifiers 
                                (seller_sku, upc, ean, asin, fnsku) 
                                VALUES (%s, %s, %s, %s, %s)
                                """,
                                (seller_sku, upc, ean, asin, fnsku)
                            )
                            
                            # Record as new identifiers if values exist
                            if asin:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'ASIN',
                                    'old_value': None,
                                    'new_value': asin,
                                    'file_id': file_id
                                })
                            
                            if upc:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'UPC',
                                    'old_value': None,
                                    'new_value': upc,
                                    'file_id': file_id
                                })
                                
                            if ean:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'EAN',
                                    'old_value': None,
                                    'new_value': ean,
                                    'file_id': file_id
                                })
                                
                            if fnsku:
                                identifier_changes.append({
                                    'seller_sku': seller_sku,
                                    'change_type': 'new',
                                    'identifier_type': 'FNSKU',
                                    'old_value': None,
                                    'new_value': fnsku,
                                    'file_id': file_id
                                })
                        
                        # Check if the listing exists
                        cur.execute(
                            'SELECT id FROM listings WHERE "seller-sku" = %s',
                            (seller_sku,)
                        )
                        existing_listing = cur.fetchone()
                        
                        if existing_listing:
                            # Update existing listing
                            id_val = existing_listing[0]
                            
                            fields = []
                            values = []
                            
                            for key, value in listing_data.items():
                                fields.append(f'"{key}" = %s')
                                values.append(value)
                            
                            # Add file_id to the record
                            fields.append('file_id = %s')
                            values.append(file_id)
                            
                            # Add ID at the end
                            values.append(id_val)
                            
                            sql = f"UPDATE listings SET {', '.join(fields)} WHERE id = %s"
                            cur.execute(sql, values)
                        else:
                            # Insert new listing
                            fields = [f'"{key}"' for key in listing_data.keys()]
                            fields.append('file_id')
                            
                            placeholders = ["%s"] * len(fields)
                            values = list(listing_data.values())
                            values.append(file_id)
                            
                            sql = f"INSERT INTO listings ({', '.join(fields)}) VALUES ({', '.join(placeholders)}) RETURNING id"
                            cur.execute(sql, values)
                            listing_id = cur.fetchone()[0]
                    
                    processed_rows += len(chunk)
                    
                    # Update the progress
                    update_progress(file_id, processed_rows, total_rows)
                
                # Insert all accumulated identifier changes for audit history
                if identifier_changes:
                    for change in identifier_changes:
                        # Find the listing_id if available
                        listing_id = None
                        if change['seller_sku']:
                            cur.execute(
                                'SELECT id FROM listings WHERE "seller-sku" = %s',
                                (change['seller_sku'],)
                            )
                            result = cur.fetchone()
                            if result:
                                listing_id = result[0]
                        
                        # Insert the change record
                        cur.execute(
                            """
                            INSERT INTO identifier_changes 
                            (listing_id, seller_sku, change_type, identifier_type, 
                             old_value, new_value, file_id) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                listing_id,
                                change['seller_sku'],
                                change['change_type'],
                                change['identifier_type'],
                                change['old_value'],
                                change['new_value'],
                                change['file_id']
                            )
                        )
        
        # Update file status to "completed"
        update_file_status(file_id, 'completed', {
            'rows_processed': total_rows,
            'identifier_changes': len(identifier_changes)
        })
        
        logger.info(f"Completed processing of report {file_id}: {total_rows} rows processed, {len(identifier_changes)} identifier changes")
        
        return {
            'status': 'success',
            'message': f'Report processed successfully. {total_rows} records processed.',
            'identifier_changes': len(identifier_changes)
        }
        
    except Exception as e:
        logger.error(f"Error in process_file_without_duplicates for {file_id}: {str(e)}")
        update_file_status(file_id, 'error', {
            'error': str(e),
            'step': 'processing_no_duplicates'
        })
        return {
            'status': 'error',
            'message': f'Error processing report: {str(e)}'
        }

if __name__ == '__main__':
    logger.info("Worker starting up...")
    app.worker_main(['worker', '--loglevel=info', '-E']) 