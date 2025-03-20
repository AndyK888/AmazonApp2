"""
Replacement query function for worker:

Original:
"SELECT id, asin, upc, ean FROM listings WHERE seller_sku = %s"

Fixed:
"SELECT id, asin1 as asin, \"product-id\" as upc, \"product-id\" as ean FROM listings WHERE \"seller-sku\" = %s"

Replace processing_details with process_status_details
"""

# Copy this query to use in the worker
FIXED_QUERY = """SELECT id, asin1 as asin, "product-id" as upc, "product-id" as ean FROM listings WHERE "seller-sku" = %s"""

# Make sure to fix processing_details to process_status_details
# "UPDATE uploaded_files SET status = %s, processing_details = %s, updated_at = NOW() WHERE id = %s" 
# should be:
 