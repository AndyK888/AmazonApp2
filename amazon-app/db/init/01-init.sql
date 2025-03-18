-- Initialize Amazon Inventory Database

-- Create tables for inventory management
CREATE TABLE listings (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255),
  item_description TEXT,
  listing_id VARCHAR(50),
  seller_sku VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10, 2),
  quantity INTEGER DEFAULT 0,
  open_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  item_is_marketplace BOOLEAN,
  product_id_type VARCHAR(20),
  zshop_shipping_fee VARCHAR(50),
  item_note TEXT,
  item_condition VARCHAR(50),
  zshop_category1 VARCHAR(100),
  zshop_browse_path TEXT,
  zshop_storefront_feature VARCHAR(100),
  asin1 VARCHAR(20),
  asin2 VARCHAR(20),
  asin3 VARCHAR(20),
  will_ship_internationally BOOLEAN,
  expedited_shipping BOOLEAN,
  zshop_boldface BOOLEAN,
  product_id VARCHAR(100),
  bid_for_featured_placement VARCHAR(50),
  add_delete VARCHAR(20),
  pending_quantity INTEGER DEFAULT 0,
  fulfillment_channel VARCHAR(50),
  merchant_shipping_group VARCHAR(100),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on commonly queried fields
CREATE INDEX idx_listing_sku ON listings(seller_sku);
CREATE INDEX idx_listing_asin ON listings(asin1);
CREATE INDEX idx_listing_status ON listings(status);
CREATE INDEX idx_listing_fulfillment_channel ON listings(fulfillment_channel);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_listing_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO listings (
  item_name, 
  item_description, 
  listing_id, 
  seller_sku, 
  price, 
  quantity, 
  open_date, 
  item_is_marketplace, 
  product_id_type, 
  item_condition, 
  asin1,
  status, 
  fulfillment_channel
) VALUES 
('ATOM SKATES Outdoor Quad Roller Wheels', 'Atom Pulse offers the best ride in an outdoor quad wheel on the market today!', '0412ZTNWUZ8AM', 'AM-1000-BK-4W-A1', 35.00, 100, '2022-04-12 15:47:04 PDT', TRUE, '4', '11', 'B08ZJWN6ZS', 'Active', 'AMAZON_NA'),
('ATOM SKATES Outdoor Quad Roller Wheels Blue', 'Atom Pulse offers the best ride in an outdoor quad wheel on the market today!', '0412ZTUNIDC', 'AM-1000-BL-4W-A3', 35.00, 50, '2022-04-12 15:47:04 PDT', TRUE, '4', '11', 'B08ZJZHS5V', 'Active', 'AMAZON_NA'),
('ATOM SKATES Pulse Outdoor Quad Roller', 'Atom Pulse offers the best ride in an outdoor quad wheel on the market today!', '0309ZYK1I2V', 'AM-1000-BL-8W-A3', 70.00, 75, '2022-03-08 16:40:14 PST', TRUE, '3', '11', 'B07RN8JV21', 'Active', 'AMAZON_NA');

-- Create a view for active listings
CREATE VIEW active_listings AS
SELECT * FROM listings
WHERE status = 'Active' AND quantity > 0; 