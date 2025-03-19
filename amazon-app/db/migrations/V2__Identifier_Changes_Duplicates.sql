-- V2__Identifier_Changes_Duplicates.sql
-- Simple migration to verify Flyway is working

-- Create a simple view for duplicate detection
CREATE OR REPLACE VIEW potential_duplicate_skus AS
SELECT 
    "seller-sku",
    COUNT(*) as count,
    COUNT(DISTINCT file_id) as file_count
FROM 
    listings
GROUP BY 
    "seller-sku"
HAVING 
    COUNT(*) > 1;
