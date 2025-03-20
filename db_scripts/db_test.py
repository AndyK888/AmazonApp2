import psycopg2
import json
import redis
import os

# Connect to the database
conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST", "db"),
    database=os.getenv("POSTGRES_DB", "amazon_inventory"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "postgres")
)

# Create a test query
with conn.cursor() as cur:
    cur.execute("UPDATE uploaded_files SET status = %s WHERE id = %s", 
        ("processing", "959815f4-db9f-4adc-9fb4-9433e4e1fffc")
    )
    conn.commit()
    print("Updated file status to processing")
    
    # Test a query with column names with dashes
    cur.execute("""
        SELECT id, asin1 as asin, "product-id" as upc, "product-id" as ean 
        FROM listings 
        WHERE "seller-sku" = %s
    """, ("AM-1000-BK-4W-A1",))
    
    row = cur.fetchone()
    print(f"Query result: {row}")

print("Test complete!") 