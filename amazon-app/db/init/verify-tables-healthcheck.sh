#!/bin/bash
set -e

# Configuration
PGUSER=${POSTGRES_USER:-postgres}
PGPASSWORD=${POSTGRES_PASSWORD:-postgres}
PGDATABASE=${POSTGRES_DB:-amazon_inventory}
PGHOST=${POSTGRES_HOST:-localhost}

# Export password for psql commands
export PGPASSWORD

# Define color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Checking database schema integrity..."

# Tables that must exist in the database with their required columns
declare -A TABLE_COLUMNS
TABLE_COLUMNS["listings"]="id,seller-sku,asin1,item-name,price,quantity,status,fulfillment-channel"
TABLE_COLUMNS["uploaded_files"]="id,file_path,original_name,status,created_at,updated_at"
TABLE_COLUMNS["identifier_changes"]="id,listing_id,seller_sku,change_type,identifier_type,old_value,new_value,reported_at"
TABLE_COLUMNS["product_identifiers"]="id,seller_sku,upc,ean,asin,fnsku,last_updated"
TABLE_COLUMNS["duplicate_sku_issues"]="id,file_id,duplicate_info,status,created_at"

# Check if all required tables exist
table_errors=0
column_errors=0

for table in "${!TABLE_COLUMNS[@]}"; do
  # Check if table exists
  if ! psql -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'; then
    echo -e "${RED}ERROR: Table '$table' does not exist!${NC}"
    table_errors=$((table_errors + 1))
    continue
  fi
  
  # If table exists, check required columns
  IFS=',' read -r -a required_columns <<< "${TABLE_COLUMNS[$table]}"
  
  for column in "${required_columns[@]}"; do
    if ! psql -U "$PGUSER" -h "$PGHOST" -d "$PGDATABASE" -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column');" | grep -q 't'; then
      echo -e "${YELLOW}WARNING: Column '$column' is missing from table '$table'!${NC}"
      column_errors=$((column_errors + 1))
    fi
  done
done

# Summarize results
if [ $table_errors -eq 0 ] && [ $column_errors -eq 0 ]; then
  echo -e "${GREEN}All required tables and columns exist!${NC}"
  exit 0
elif [ $table_errors -gt 0 ]; then
  echo -e "${RED}Schema validation failed: $table_errors tables missing!${NC}"
  exit 1
elif [ $column_errors -gt 0 ]; then
  echo -e "${YELLOW}Schema validation warning: $column_errors columns missing!${NC}"
  # Exit with code 0 for missing columns to allow startup to continue
  exit 0
fi 