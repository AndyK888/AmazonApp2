-- Create the identifier_changes table to track changes to product identifiers
CREATE TABLE IF NOT EXISTS identifier_changes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  file_id INTEGER REFERENCES uploads(id) ON DELETE SET NULL,
  identifier_type VARCHAR(50) NOT NULL, -- ASIN, UPC, EAN, FNSKU, etc.
  old_value TEXT,
  new_value TEXT,
  change_type VARCHAR(50) NOT NULL, -- new, modified, removed
  reported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  
  -- Indices for common queries
  INDEX idx_identifier_changes_user_id (user_id),
  INDEX idx_identifier_changes_product_id (product_id),
  INDEX idx_identifier_changes_file_id (file_id),
  INDEX idx_identifier_changes_reported_at (reported_at),
  INDEX idx_identifier_changes_acknowledged (acknowledged_at)
);

-- Create tables for duplicate SKU issue tracking
CREATE TABLE IF NOT EXISTS duplicate_issues (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_id INTEGER REFERENCES uploads(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, resolved, cancelled
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  
  -- Indices for common queries
  INDEX idx_duplicate_issues_user_id (user_id),
  INDEX idx_duplicate_issues_file_id (file_id),
  INDEX idx_duplicate_issues_status (status),
  INDEX idx_duplicate_issues_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS duplicate_items (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES duplicate_issues(id) ON DELETE CASCADE,
  sku VARCHAR(255) NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  item_name TEXT,
  data JSON,
  
  -- Indices for common queries
  INDEX idx_duplicate_items_issue_id (issue_id),
  INDEX idx_duplicate_items_sku (sku),
  INDEX idx_duplicate_items_product_id (product_id)
);

-- Create a function to detect and record duplicate SKUs from uploaded files
CREATE OR REPLACE FUNCTION create_duplicate_issue_for_upload() 
RETURNS TRIGGER AS $$
DECLARE
  v_issue_id INTEGER;
  v_duplicate_count INTEGER;
BEGIN
  -- Check if there are duplicate SKUs in the uploaded file
  WITH duplicates AS (
    SELECT 
      seller_sku, 
      COUNT(*) as count, 
      json_agg(json_build_object(
        'row_number', row_number,
        'item_name', item_name,
        'asin', asin,
        'upc', upc,
        'ean', ean,
        'fnsku', fnsku,
        'price', price
      )) as items
    FROM upload_data
    WHERE upload_id = NEW.id
    GROUP BY seller_sku
    HAVING COUNT(*) > 1
  )
  SELECT COUNT(*) INTO v_duplicate_count FROM duplicates;
  
  -- If duplicates found, create an issue
  IF v_duplicate_count > 0 THEN
    -- Create the duplicate issue
    INSERT INTO duplicate_issues 
      (user_id, file_id, status, created_at, updated_at)
    VALUES 
      (NEW.user_id, NEW.id, 'pending', NOW(), NOW())
    RETURNING id INTO v_issue_id;
    
    -- Insert the duplicate items
    INSERT INTO duplicate_items (issue_id, sku, item_name, data)
    SELECT 
      v_issue_id,
      ud.seller_sku,
      ud.item_name,
      json_build_object(
        'asin', ud.asin,
        'upc', ud.upc,
        'ean', ud.ean,
        'fnsku', ud.fnsku,
        'price', ud.price,
        'quantity', ud.quantity,
        'row_number', ud.row_number
      )
    FROM 
      upload_data ud
    WHERE 
      ud.upload_id = NEW.id
      AND ud.seller_sku IN (
        SELECT seller_sku 
        FROM upload_data 
        WHERE upload_id = NEW.id 
        GROUP BY seller_sku 
        HAVING COUNT(*) > 1
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the uploads table
CREATE TRIGGER trigger_create_duplicate_issue
AFTER INSERT ON uploads
FOR EACH ROW
EXECUTE FUNCTION create_duplicate_issue_for_upload(); 