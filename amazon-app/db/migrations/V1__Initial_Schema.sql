-- V1__Initial_Schema.sql
-- Initial Database Schema for Amazon Inventory Management

-- Initialize Amazon Inventory Database
-- Create tables for inventory management
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  "item-name" VARCHAR(255),
  "item-description" TEXT,
  "listing-id" VARCHAR(50),
  "seller-sku" VARCHAR(100) NOT NULL,
  "price" DECIMAL(10, 2),
  "quantity" INTEGER DEFAULT 0,
  "open-date" TIMESTAMP WITH TIME ZONE,
  "image-url" TEXT,
  "item-is-marketplace" BOOLEAN,
  "product-id-type" VARCHAR(20),
  "zshop-shipping-fee" VARCHAR(50),
  "item-note" TEXT,
  "item-condition" VARCHAR(50),
  "zshop-category1" VARCHAR(100),
  "zshop-browse-path" TEXT,
  "zshop-storefront-feature" VARCHAR(100),
  "asin1" VARCHAR(20),
  "asin2" VARCHAR(20),
  "asin3" VARCHAR(20),
  "will-ship-internationally" BOOLEAN,
  "expedited-shipping" BOOLEAN,
  "zshop-boldface" BOOLEAN,
  "product-id" VARCHAR(100),
  "bid-for-featured-placement" VARCHAR(50),
  "add-delete" VARCHAR(20),
  "pending-quantity" INTEGER DEFAULT 0,
  "fulfillment-channel" VARCHAR(50),
  "merchant-shipping-group" VARCHAR(100),
  "status" VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_listing_sku ON listings("seller-sku");
CREATE INDEX IF NOT EXISTS idx_listing_asin ON listings("asin1");
CREATE INDEX IF NOT EXISTS idx_listing_status ON listings("status");
CREATE INDEX IF NOT EXISTS idx_listing_fulfillment_channel ON listings("fulfillment-channel");

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_listing_updated_at ON listings;
CREATE TRIGGER update_listing_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a view for active listings
DROP VIEW IF EXISTS active_listings CASCADE;
CREATE VIEW active_listings AS
SELECT * FROM listings
WHERE "status" = 'Active' AND "quantity" > 0;

-- Create table for tracking uploaded files and their processing status
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'error'
    processed_rows INTEGER DEFAULT 0,
    total_rows INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add trigger to update timestamps
DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON uploaded_files;
CREATE TRIGGER update_uploaded_files_updated_at
BEFORE UPDATE ON uploaded_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add file_id column to listings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'file_id'
    ) THEN
        ALTER TABLE listings ADD COLUMN file_id UUID REFERENCES uploaded_files(id);
    END IF;
END $$;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_listings_file_id ON listings(file_id);

-- Create view for processing status
DROP VIEW IF EXISTS file_processing_status CASCADE;
CREATE VIEW file_processing_status AS
SELECT 
    uf.id,
    uf.original_name,
    uf.status,
    uf.processed_rows,
    uf.total_rows,
    uf.error_message,
    uf.created_at,
    uf.completed_at,
    CASE 
        WHEN uf.total_rows > 0 THEN 
            ROUND((uf.processed_rows::numeric / uf.total_rows) * 100, 1)
        ELSE
            0
    END AS progress_percentage,
    COUNT(l.id) AS listings_count
FROM 
    uploaded_files uf
LEFT JOIN 
    listings l ON l.file_id = uf.id
GROUP BY 
    uf.id, uf.original_name, uf.status, uf.processed_rows, uf.total_rows, 
    uf.error_message, uf.created_at, uf.completed_at;

-- Create tables for tracking product identifiers
CREATE TABLE IF NOT EXISTS product_identifiers (
    id SERIAL PRIMARY KEY,
    "seller-sku" VARCHAR(100) NOT NULL,
    "asin" VARCHAR(20),
    "upc" VARCHAR(20),
    "ean" VARCHAR(20),
    "isbn" VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sku_identifiers UNIQUE ("seller-sku")
);

-- Create table for tracking changes to identifiers
CREATE TABLE IF NOT EXISTS identifier_changes (
    id SERIAL PRIMARY KEY,
    "seller-sku" VARCHAR(100) NOT NULL,
    "identifier_type" VARCHAR(10) NOT NULL, -- "asin", "upc", "ean", "isbn"
    "old_value" VARCHAR(30),
    "new_value" VARCHAR(30),
    "acknowledged" BOOLEAN DEFAULT FALSE,
    "acknowledged_at" TIMESTAMP WITH TIME ZONE,
    "acknowledged_by" VARCHAR(100),
    "file_id" UUID REFERENCES uploaded_files(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add reference to original listing
ALTER TABLE identifier_changes 
    ADD COLUMN IF NOT EXISTS listing_id INTEGER REFERENCES listings(id);

-- Create indices for identifier tables
CREATE INDEX IF NOT EXISTS idx_product_identifiers_sku ON product_identifiers(seller_sku);
CREATE INDEX IF NOT EXISTS idx_product_identifiers_asin ON product_identifiers(asin);
CREATE INDEX IF NOT EXISTS idx_identifier_changes_sku ON identifier_changes(seller_sku);
CREATE INDEX IF NOT EXISTS idx_identifier_changes_type ON identifier_changes(identifier_type);
CREATE INDEX IF NOT EXISTS idx_identifier_changes_acknowledged ON identifier_changes(acknowledged);

-- Add trigger to update timestamps
DROP TRIGGER IF EXISTS update_product_identifiers_updated_at ON product_identifiers;
CREATE TRIGGER update_product_identifiers_updated_at
BEFORE UPDATE ON product_identifiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create view for unacknowledged changes
DROP VIEW IF EXISTS unacknowledged_identifier_changes CASCADE;
CREATE VIEW unacknowledged_identifier_changes AS
SELECT 
    ic.*,
    pi.asin,
    pi.upc,
    pi.ean,
    pi.fnsku,
    l."item-name",
    uf.original_name as file_name
FROM 
    identifier_changes ic
LEFT JOIN
    product_identifiers pi ON ic.seller_sku = pi.seller_sku
LEFT JOIN
    listings l ON ic.listing_id = l.id
LEFT JOIN
    uploaded_files uf ON ic.file_id = uf.id
WHERE
    ic.acknowledged = FALSE;

-- Create table to track duplicate items
CREATE TABLE IF NOT EXISTS duplicate_items (
    id SERIAL PRIMARY KEY,
    "seller-sku" VARCHAR(100) NOT NULL,
    "asin" VARCHAR(20),
    "listing_id" INTEGER REFERENCES listings(id),
    "file_id" UUID REFERENCES uploaded_files(id),
    "resolved" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for duplicate items table
CREATE INDEX IF NOT EXISTS idx_duplicate_items_sku ON duplicate_items(sku);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_duplicate_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_duplicate_items_timestamp ON duplicate_items;
CREATE TRIGGER update_duplicate_items_timestamp
BEFORE UPDATE ON duplicate_items
FOR EACH ROW
EXECUTE FUNCTION update_duplicate_items_timestamp();

-- Insert some sample data if the database is empty
INSERT INTO listings (
  "item-name", 
  "item-description", 
  "listing-id", 
  "seller-sku", 
  "price", 
  "quantity", 
  "open-date", 
  "item-is-marketplace", 
  "product-id-type", 
  "item-condition", 
  "asin1",
  "status", 
  "fulfillment-channel"
)
SELECT 
  'ATOM SKATES Outdoor Quad Roller Wheels', 
  'Atom Pulse offers the best ride in an outdoor quad wheel on the market today!', 
  '0412ZTNWUZ8AM', 
  'AM-1000-BK-4W-A1', 
  35.00, 
  100, 
  '2022-04-12 15:47:04 PDT', 
  TRUE, 
  '4', 
  '11', 
  'B08ZJWN6ZS', 
  'Active', 
  'AMAZON_NA'
WHERE 
  NOT EXISTS (SELECT 1 FROM listings);

INSERT INTO listings (
  "item-name", 
  "item-description", 
  "listing-id", 
  "seller-sku", 
  "price", 
  "quantity", 
  "open-date", 
  "item-is-marketplace", 
  "product-id-type", 
  "item-condition", 
  "asin1",
  "status", 
  "fulfillment-channel"
)
SELECT
  'ATOM SKATES Outdoor Quad Roller Wheels Blue', 
  'Atom Pulse offers the best ride in an outdoor quad wheel on the market today!', 
  '0412ZTUNIDC', 
  'AM-1000-BL-4W-A3', 
  35.00, 
  50, 
  '2022-04-12 15:47:04 PDT', 
  TRUE, 
  '4', 
  '11', 
  'B08ZJZHS5V', 
  'Active', 
  'AMAZON_NA'
WHERE 
  NOT EXISTS (SELECT 1 FROM listings WHERE "seller-sku" = 'AM-1000-BL-4W-A3');

INSERT INTO listings (
  "item-name", 
  "item-description", 
  "listing-id", 
  "seller-sku", 
  "price", 
  "quantity", 
  "open-date", 
  "item-is-marketplace", 
  "product-id-type", 
  "item-condition", 
  "asin1",
  "status", 
  "fulfillment-channel"
)
SELECT
  'ATOM SKATES Pulse Outdoor Quad Roller', 
  'Atom Pulse offers the best ride in an outdoor quad wheel on the market today!', 
  '0309ZYK1I2V', 
  'AM-1000-BL-8W-A3', 
  70.00, 
  75, 
  '2022-03-08 16:40:14 PST', 
  TRUE, 
  '3', 
  '11', 
  'B07RN8JV21', 
  'Active', 
  'AMAZON_NA'
WHERE 
  NOT EXISTS (SELECT 1 FROM listings WHERE "seller-sku" = 'AM-1000-BL-8W-A3'); 