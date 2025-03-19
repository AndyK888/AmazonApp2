-- Create a table for storing duplicate items
CREATE TABLE IF NOT EXISTS duplicate_items (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_id INTEGER,
    item_name VARCHAR(255),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_duplicate_issue FOREIGN KEY (issue_id) REFERENCES duplicate_sku_issues(id) ON DELETE CASCADE
);

-- Create indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_duplicate_items_issue_id ON duplicate_items(issue_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_items_sku ON duplicate_items(sku);

-- Create trigger to update timestamp on update
CREATE OR REPLACE FUNCTION update_duplicate_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_duplicate_items_timestamp ON duplicate_items;
CREATE TRIGGER update_duplicate_items_timestamp
BEFORE UPDATE ON duplicate_items
FOR EACH ROW
EXECUTE FUNCTION update_duplicate_items_timestamp(); 