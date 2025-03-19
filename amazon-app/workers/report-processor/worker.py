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

# Log worker startup
logger.info("Worker starting up...")

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
                        
                        # Special handling for All Listings Reports
                        if report_type == 'all_listings':
                            # Handle any specific transformations needed for all listings report
                            # For example, map different column names that might be in this report format
                            if 'open-date' in listing_data:
                                listing_data['open-date'] = listing_data['open-date'][:19]  # Truncate to fit timestamp format
                            
                            # Additional mappings specific to All Listings Report can be added here
                        
                        # Check if this SKU already exists in the database
                        sku = listing_data['seller-sku']
                        cur.execute(
                            "SELECT id, asin, upc, ean FROM listings WHERE seller_sku = %s",
                            (sku,)
                        )
                        existing = cur.fetchone()
                        
                        # Track identifier changes if this is an update
                        if existing:
                            listing_id, old_asin, old_upc, old_ean = existing
                            new_asin = listing_data.get('asin')
                            new_upc = listing_data.get('upc')
                            new_ean = listing_data.get('ean')
                            
                            # Check if any identifiers have changed
                            if ((old_asin is not None and new_asin is not None and old_asin != new_asin) or
                                (old_upc is not None and new_upc is not None and old_upc != new_upc) or
                                (old_ean is not None and new_ean is not None and old_ean != new_ean)):
                                
                                identifier_changes.append({
                                    'listing_id': listing_id,
                                    'sku': sku,
                                    'old_asin': old_asin,
                                    'new_asin': new_asin,
                                    'old_upc': old_upc,
                                    'new_upc': new_upc,
                                    'old_ean': old_ean,
                                    'new_ean': new_ean,
                                    'changed_at': time.strftime('%Y-%m-%d %H:%M:%S')
                                })
                            
                            # Update existing listing
                            columns = []
                            values = []
                            for key, value in listing_data.items():
                                if key != 'seller-sku':  # Skip SKU as it's the primary key
                                    columns.append(key.replace('-', '_'))
                                    values.append(value)
                            
                            if values:  # Only update if there are values to update
                                # Create the SET part of the SQL query
                                set_clause = ", ".join([f"{col} = %s" for col in columns])
                                values.append(sku)  # Add SKU for WHERE clause
                                
                                update_query = f"UPDATE listings SET {set_clause}, updated_at = NOW() WHERE seller_sku = %s"
                                cur.execute(update_query, values)
                        else:
                            # Insert new listing
                            columns = []
                            values = []
                            for key, value in listing_data.items():
                                columns.append(key.replace('-', '_'))
                                values.append(value)
                            
                            # Add timestamps
                            columns.extend(['created_at', 'updated_at'])
                            values.extend([time.strftime('%Y-%m-%d %H:%M:%S'), time.strftime('%Y-%m-%d %H:%M:%S')])
                            
                            # Create the INSERT SQL query
                            placeholders = ", ".join(["%s"] * len(values))
                            cols = ", ".join(columns)
                            
                            insert_query = f"INSERT INTO listings ({cols}) VALUES ({placeholders})"
                            cur.execute(insert_query, values)
                        
                        processed_rows += 1
                        
                        # Update progress periodically
                        if processed_rows % 100 == 0 or processed_rows == total_rows:
                            update_progress(file_id, processed_rows, total_rows)
                
                # Record any identifier changes
                if identifier_changes:
                    for change in identifier_changes:
                        cur.execute(
                            """
                            INSERT INTO identifier_changes 
                            (listing_id, sku, old_asin, new_asin, old_upc, new_upc, old_ean, new_ean, file_id, changed_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                change['listing_id'], change['sku'], 
                                change['old_asin'], change['new_asin'],
                                change['old_upc'], change['new_upc'],
                                change['old_ean'], change['new_ean'],
                                file_id,
                                change['changed_at']
                            )
                        )
        
        # Update file status to "processed"
        update_file_status(file_id, 'processed', {
            'total_rows': total_rows,
            'processed_rows': processed_rows,
            'identifier_changes': len(identifier_changes)
        })
        
        return {
            'status': 'processed',
            'message': f'Successfully processed {processed_rows} of {total_rows} rows',
            'identifier_changes': len(identifier_changes)
        }
        
    except Exception as e:
        logger.error(f"Error in process_file_without_duplicates for file {file_id}: {str(e)}")
        
        # Update file status to "error"
        update_file_status(file_id, 'error', {
            'error': str(e)
        })
        
        # Re-raise the exception
        raise

def update_file_status(file_id, status, details=None):
    """Update the status of a file in the database"""
    logger.info(f"Updating file {file_id} status to {status}")
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                if details:
                    cur.execute(
                        "UPDATE uploaded_files SET status = %s, processing_details = %s, updated_at = NOW() WHERE id = %s",
                        (status, json.dumps(details), file_id)
                    )
                else:
                    cur.execute(
                        "UPDATE uploaded_files SET status = %s, updated_at = NOW() WHERE id = %s",
                        (status, file_id)
                    )
    except Exception as e:
        logger.error(f"Error updating file status: {str(e)}")

def update_progress(file_id, processed_rows, total_rows):
    """Update the progress of a file being processed"""
    progress = int(100 * processed_rows / total_rows) if total_rows > 0 else 100
    logger.info(f"File {file_id}: Processed {processed_rows}/{total_rows} rows ({progress}%)")
    update_file_status(file_id, 'processing', {
        'progress': progress,
        'processed_rows': processed_rows,
        'total_rows': total_rows
    })

@app.task(name='resolve_duplicates')
def resolve_duplicates(issue_id, file_id):
    """
    Resolve duplicate SKUs in a file based on user selections
    """
    try:
        logger.info(f"Resolving duplicates for issue {issue_id} (File ID: {file_id})")
        
        # Get duplicate issue details
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT duplicate_info, resolutions FROM duplicate_sku_issues WHERE id = %s",
                    (issue_id,)
                )
                result = cur.fetchone()
                
                if not result:
                    logger.error(f"Duplicate issue {issue_id} not found")
                    return {
                        'status': 'error',
                        'message': f'Duplicate issue {issue_id} not found'
                    }
                
                duplicate_info = json.loads(result[0])
                resolutions = json.loads(result[1]) if result[1] else {}
        
        # Check if resolutions are complete
        if not resolutions:
            logger.error(f"No resolutions provided for issue {issue_id}")
            return {
                'status': 'error',
                'message': 'No resolutions provided'
            }
        
        # Get the file path
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT file_path FROM uploaded_files WHERE id = %s",
                    (file_id,)
                )
                result = cur.fetchone()
                
                if not result:
                    logger.error(f"File {file_id} not found")
                    return {
                        'status': 'error',
                        'message': f'File {file_id} not found'
                    }
                
                file_path = result[0]
        
        # Read the file
        df = pd.read_csv(file_path, sep='\t', encoding='utf-8')
        df.columns = [col.strip() for col in df.columns]
        
        # Apply resolutions
        df = apply_duplicate_resolutions(df, duplicate_info, resolutions)
        
        # Update issue status
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE duplicate_sku_issues SET status = 'resolved', updated_at = NOW() WHERE id = %s",
                    (issue_id,)
                )
        
        # Process the file now that duplicates are resolved
        return process_file_without_duplicates(df, file_id)
        
    except Exception as e:
        logger.error(f"Error resolving duplicates for issue {issue_id}: {str(e)}")
        
        # Update issue status to "error"
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE duplicate_sku_issues SET status = 'error', error = %s, updated_at = NOW() WHERE id = %s",
                    (str(e), issue_id)
                )
        
        # Update file status to "error"
        update_file_status(file_id, 'error', {
            'error': f'Error resolving duplicates: {str(e)}'
        })
        
        # Re-raise the exception
        raise

def apply_duplicate_resolutions(df, duplicate_info, resolutions):
    """Apply user-selected resolutions to duplicate SKUs"""
    resolved_df = df.copy()
    
    # Track rows to remove
    rows_to_drop = []
    
    # Apply resolutions for each SKU
    for sku, resolution in resolutions.items():
        if sku not in duplicate_info:
            logger.warning(f"SKU {sku} not found in duplicate info")
            continue
        
        action = resolution.get('action')
        selected_index = resolution.get('selected_index')
        
        if action == 'keep_one' and selected_index is not None:
            # Keep only the selected row, remove others
            duplicate_rows = [item['row_index'] for item in duplicate_info[sku]]
            rows_to_keep = [duplicate_rows[selected_index]]
            rows_to_drop.extend([idx for idx in duplicate_rows if idx not in rows_to_keep])
        
        elif action == 'merge':
            # Implement custom merge logic here if needed
            # For now, just keep the first occurrence
            duplicate_rows = [item['row_index'] for item in duplicate_info[sku]]
            rows_to_keep = [duplicate_rows[0]]
            rows_to_drop.extend([idx for idx in duplicate_rows if idx not in rows_to_keep])
        
        elif action == 'remove_all':
            # Remove all occurrences of this SKU
            duplicate_rows = [item['row_index'] for item in duplicate_info[sku]]
            rows_to_drop.extend(duplicate_rows)
    
    # Remove the unwanted rows
    resolved_df = resolved_df.drop(rows_to_drop)
    
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

if __name__ == '__main__':
    logger.info("Worker starting up...")
    app.worker_main(['worker', '--loglevel=info', '-E']) 