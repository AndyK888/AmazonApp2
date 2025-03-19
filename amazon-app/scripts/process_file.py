import os
import sys
import csv
import json
import logging
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import pandas as pd

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("file_processor.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("file_processor")

def get_db_connection():
    """Establish a database connection"""
    try:
        conn = psycopg2.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            database=os.environ.get('DB_NAME', 'amazon_inventory'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'postgres')
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def process_file(file_id):
    """Process an uploaded file and update database"""
    logger.info(f"Processing file ID: {file_id}")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get file info
        cursor.execute(
            "SELECT file_path, user_id FROM uploads WHERE id = %s",
            (file_id,)
        )
        file_info = cursor.fetchone()
        
        if not file_info:
            logger.error(f"File ID {file_id} not found")
            return False
        
        file_path, user_id = file_info
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found at {file_path}")
            update_status(cursor, file_id, 'error', 'File not found')
            conn.commit()
            return False
        
        # Read the file
        df = pd.read_csv(file_path)
        logger.info(f"Successfully read file with {len(df)} rows")
        
        # Clean column names (lowercase, remove whitespace)
        df.columns = [col.lower().strip().replace(" ", "_").replace("-", "_") for col in df.columns]
        
        # Check for required columns
        required_columns = ['seller_sku', 'asin']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            error_msg = f"Missing required columns: {', '.join(missing_columns)}"
            logger.error(error_msg)
            update_status(cursor, file_id, 'error', error_msg)
            conn.commit()
            return False
        
        # Insert data into temporary table
        logger.info("Inserting data into upload_data table")
        insert_upload_data(cursor, df, file_id)
        
        # Check for duplicate SKUs
        logger.info("Checking for duplicate SKUs")
        duplicate_skus = check_duplicate_skus(cursor, file_id)
        
        if duplicate_skus:
            duplicate_count = len(duplicate_skus)
            logger.warning(f"Found {duplicate_count} duplicate SKUs")
            
            # Update status but continue processing
            update_status(
                cursor, 
                file_id, 
                'duplicate_skus', 
                f"Found {duplicate_count} duplicate SKUs: {', '.join(duplicate_skus[:5])}" +
                ("..." if duplicate_count > 5 else "")
            )
        
        # Process identifier changes
        logger.info("Processing identifier changes")
        process_identifier_changes(cursor, file_id, user_id)
        
        # Update products table with new/updated products
        logger.info("Updating products table")
        update_products(cursor, file_id, user_id)
        
        # Update status to completed
        update_status(cursor, file_id, 'completed', 'File processed successfully')
        
        # Commit all changes
        conn.commit()
        logger.info(f"File ID {file_id} processed successfully")
        return True
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error processing file: {e}", exc_info=True)
        
        try:
            update_status(cursor, file_id, 'error', str(e)[:255])
            conn.commit()
        except:
            logger.error("Failed to update status after error", exc_info=True)
            
        return False
        
    finally:
        cursor.close()
        conn.close()

def insert_upload_data(cursor, df, file_id):
    """Insert data from dataframe into upload_data table"""
    # First, clear any existing data for this upload
    cursor.execute("DELETE FROM upload_data WHERE upload_id = %s", (file_id,))
    
    # Prepare data for insert
    columns = list(df.columns)
    
    # Add row number and upload_id to each row
    data = []
    for idx, row in df.iterrows():
        row_dict = dict(row)
        row_dict['upload_id'] = file_id
        row_dict['row_number'] = idx + 1  # 1-based row number
        data.append(row_dict)
    
    # Convert to list of tuples
    values = [tuple(row[col] if col in row else None for col in ['upload_id', 'row_number'] + columns) 
              for row in data]
    
    # Create insert query
    columns_str = ", ".join(['upload_id', 'row_number'] + columns)
    placeholders = ", ".join(["%s"] * (len(columns) + 2))
    
    query = f"INSERT INTO upload_data ({columns_str}) VALUES ({placeholders})"
    
    # Execute insert
    cursor.executemany(query, values)
    logger.info(f"Inserted {len(values)} rows into upload_data table")

def check_duplicate_skus(cursor, file_id):
    """Check for duplicate SKUs in the uploaded file"""
    cursor.execute("""
        SELECT seller_sku 
        FROM upload_data 
        WHERE upload_id = %s 
        GROUP BY seller_sku 
        HAVING COUNT(*) > 1
    """, (file_id,))
    
    duplicate_skus = [row[0] for row in cursor.fetchall()]
    return duplicate_skus

def process_identifier_changes(cursor, file_id, user_id):
    """Detect and record changes in product identifiers"""
    logger.info("Detecting identifier changes...")
    
    # Identifier types to check
    identifier_types = ['asin', 'upc', 'ean', 'fnsku']
    
    # First, get all SKUs from the current upload
    cursor.execute("""
        SELECT 
            seller_sku, asin, upc, ean, fnsku, item_name 
        FROM 
            upload_data 
        WHERE 
            upload_id = %s
    """, (file_id,))
    
    new_records = {row[0]: {'asin': row[1], 'upc': row[2], 'ean': row[3], 'fnsku': row[4], 'item_name': row[5]} 
                  for row in cursor.fetchall()}
    
    # Then, get existing products from the database
    cursor.execute("""
        SELECT 
            p.id, p.seller_sku, p.asin, p.upc, p.ean, p.fnsku, p.item_name
        FROM 
            products p
        WHERE 
            p.user_id = %s AND p.seller_sku IN %s
    """, (user_id, tuple(new_records.keys()) or ('',)))
    
    existing_products = {row[1]: {'id': row[0], 'asin': row[2], 'upc': row[3], 'ean': row[4], 'fnsku': row[5], 'item_name': row[6]} 
                       for row in cursor.fetchall()}
    
    changes = []
    
    # Compare existing products with new data
    for sku, new_data in new_records.items():
        if sku in existing_products:
            # Product exists, check for changes
            existing = existing_products[sku]
            
            for identifier in identifier_types:
                new_value = new_data.get(identifier)
                old_value = existing.get(identifier)
                
                # Only process if at least one value exists
                if new_value or old_value:
                    change_type = None
                    
                    if old_value is None and new_value:
                        change_type = 'new'
                    elif old_value and new_value is None:
                        change_type = 'removed'
                    elif old_value != new_value:
                        change_type = 'modified'
                        
                    if change_type:
                        changes.append({
                            'user_id': user_id,
                            'product_id': existing['id'],
                            'file_id': file_id,
                            'identifier_type': identifier.upper(),
                            'old_value': old_value,
                            'new_value': new_value,
                            'change_type': change_type
                        })
        else:
            # New product, record all identifiers as new
            for identifier in identifier_types:
                value = new_data.get(identifier)
                if value:
                    changes.append({
                        'user_id': user_id,
                        'product_id': None,  # Will be updated after product is created
                        'file_id': file_id,
                        'identifier_type': identifier.upper(),
                        'old_value': None,
                        'new_value': value,
                        'change_type': 'new'
                    })
    
    # Insert all changes
    if changes:
        columns = changes[0].keys()
        values = [tuple(record[col] for col in columns) for record in changes]
        
        query = f"""
            INSERT INTO identifier_changes 
            ({', '.join(columns)}) 
            VALUES %s
        """
        
        execute_values(cursor, query, values)
        logger.info(f"Recorded {len(changes)} identifier changes")

def update_products(cursor, file_id, user_id):
    """Update products table with data from the upload"""
    logger.info("Updating products table with new data")
    
    # First, prepare a temp table with the latest data from the upload
    cursor.execute("""
        CREATE TEMP TABLE latest_upload_data AS
        SELECT DISTINCT ON (seller_sku) 
            upload_id, seller_sku, asin, upc, ean, fnsku, 
            item_name, price, quantity, condition, fulfillment_channel
        FROM 
            upload_data
        WHERE 
            upload_id = %s
        ORDER BY 
            seller_sku, row_number DESC
    """, (file_id,))
    
    # Update existing products
    cursor.execute("""
        UPDATE products p
        SET 
            asin = ud.asin,
            upc = ud.upc,
            ean = ud.ean,
            fnsku = ud.fnsku,
            item_name = ud.item_name,
            price = COALESCE(ud.price, p.price),
            quantity = COALESCE(ud.quantity, p.quantity),
            condition = COALESCE(ud.condition, p.condition),
            fulfillment_channel = COALESCE(ud.fulfillment_channel, p.fulfillment_channel),
            updated_at = NOW()
        FROM 
            latest_upload_data ud
        WHERE 
            p.seller_sku = ud.seller_sku AND
            p.user_id = %s
        RETURNING p.id, p.seller_sku
    """, (user_id,))
    
    updated_products = cursor.fetchall()
    updated_skus = {row[1]: row[0] for row in updated_products}
    logger.info(f"Updated {len(updated_products)} existing products")
    
    # Insert new products
    cursor.execute("""
        INSERT INTO products 
        (user_id, seller_sku, asin, upc, ean, fnsku, item_name, price, quantity, condition, fulfillment_channel, created_at, updated_at)
        SELECT 
            %s, ud.seller_sku, ud.asin, ud.upc, ud.ean, ud.fnsku, ud.item_name, 
            ud.price, ud.quantity, ud.condition, ud.fulfillment_channel, NOW(), NOW()
        FROM 
            latest_upload_data ud
        WHERE 
            ud.seller_sku NOT IN (
                SELECT seller_sku FROM products WHERE user_id = %s
            )
        RETURNING id, seller_sku
    """, (user_id, user_id))
    
    new_products = cursor.fetchall()
    new_product_ids = {row[1]: row[0] for row in new_products}
    logger.info(f"Inserted {len(new_products)} new products")
    
    # Update product_id for new identifier changes
    if new_product_ids:
        # Convert to list of (product_id, sku) tuples for execute_values
        product_id_sku_pairs = [(pid, sku) for sku, pid in new_product_ids.items()]
        
        # Update the product_id in identifier_changes for new products
        execute_values(cursor, """
            UPDATE identifier_changes
            SET product_id = data.product_id
            FROM (VALUES %s) AS data(product_id, sku)
            WHERE 
                identifier_changes.file_id = %s AND 
                product_id IS NULL AND
                EXISTS (
                    SELECT 1 FROM upload_data 
                    WHERE upload_id = %s AND 
                    seller_sku = data.sku
                )
        """, product_id_sku_pairs, template="(%s, %s)", page_size=100)
    
    # Clean up temp table
    cursor.execute("DROP TABLE latest_upload_data")

def update_status(cursor, file_id, status, message=None):
    """Update the status of a file upload"""
    cursor.execute(
        "UPDATE uploads SET status = %s, status_message = %s, updated_at = NOW() WHERE id = %s",
        (status, message, file_id)
    )

if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("Usage: python process_file.py <file_id>")
        sys.exit(1)
    
    file_id = int(sys.argv[1])
    success = process_file(file_id)
    
    sys.exit(0 if success else 1) 