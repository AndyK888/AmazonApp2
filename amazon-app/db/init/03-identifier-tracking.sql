-- Table to track the history of product identifier changes (keep all changes for audit)
CREATE TABLE IF NOT EXISTS identifier_changes (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id),
    seller_sku VARCHAR(100) NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'new', 'modified', 'merged'
    identifier_type VARCHAR(20) NOT NULL, -- 'UPC', 'EAN', 'ASIN', 'FNSKU'
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_id UUID REFERENCES uploaded_files(id),
    acknowledged BOOLEAN DEFAULT FALSE
);

-- Table to store CURRENT identifier relationships (most recent valid values)
CREATE TABLE IF NOT EXISTS product_identifiers (
    id SERIAL PRIMARY KEY,
    seller_sku VARCHAR(100) NOT NULL,
    upc VARCHAR(100),
    ean VARCHAR(100),
    asin VARCHAR(20),
    fnsku VARCHAR(20),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seller_sku) -- Ensures no duplicate SKUs
);

-- Table to track duplicate SKU issues that need resolution
CREATE TABLE IF NOT EXISTS duplicate_sku_issues (
    id SERIAL PRIMARY KEY,
    file_id UUID REFERENCES uploaded_files(id),
    duplicate_info JSONB NOT NULL,  -- Stores details about duplicate SKUs
    resolution_strategy JSONB,      -- Stores user's resolution choices
    status VARCHAR(50) NOT NULL,    -- 'pending', 'resolved', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Update uploaded_files table to track process status
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS 
    process_status_details JSONB;

-- Create indexes for performance
CREATE INDEX idx_identifier_changes_seller_sku ON identifier_changes(seller_sku);
CREATE INDEX idx_identifier_changes_reported_at ON identifier_changes(reported_at);
CREATE INDEX idx_product_identifiers_seller_sku ON product_identifiers(seller_sku);
CREATE INDEX idx_duplicate_sku_issues_file_id ON duplicate_sku_issues(file_id);
CREATE INDEX idx_duplicate_sku_issues_status ON duplicate_sku_issues(status);

-- Add triggers for updated_at timestamp
CREATE TRIGGER update_product_identifiers_updated_at
BEFORE UPDATE ON product_identifiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create view for unresolved duplicate issues
CREATE OR REPLACE VIEW pending_duplicate_issues AS
SELECT 
    di.id,
    di.file_id,
    di.duplicate_info,
    di.status,
    di.created_at,
    uf.original_name as file_name,
    (SELECT COUNT(*) FROM jsonb_object_keys(di.duplicate_info)) AS duplicate_count
FROM 
    duplicate_sku_issues di
JOIN
    uploaded_files uf ON di.file_id = uf.id
WHERE 
    di.status = 'pending'
ORDER BY 
    di.created_at DESC; 